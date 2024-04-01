import React, { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    HealthPlanFormDataType,
    packageName,
    RateInfoType,
} from '../../../common-code/healthPlanFormDataType'
import { HealthPlanPackageStatus, Program } from '../../../gen/gqlClient'
import { useIndexHealthPlanPackagesQuery } from '../../../gen/gqlClient'
import { recordJSException } from '../../../otelHelpers'
import { getCurrentRevisionFromHealthPlanPackage } from '../../../gqlHelpers'
import { SharedRateCertDisplay } from '../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { DataDetailMissingField } from '../../DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../DataDetail/DataDetailContactField/DataDetailContactField'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../DocumentWarning'
import { SectionCard } from '../../SectionCard'
import { convertToGenericDocuments } from '../UploadedDocumentsTable/UploadedDocumentsTable'
// Used for refreshed packages names keyed by their package id
// package name includes (Draft) for draft packages.
type PackageNameType = string
type PackageNamesLookupType = {
    [id: string]: {
        packageName: PackageNameType
        status: HealthPlanPackageStatus
    }
}

export type RateDetailsSummarySectionProps = {
    submission: HealthPlanFormDataType
    editNavigateTo?: string
    documentDateLookupTable: DocumentDateLookupTableType
    isCMSUser?: boolean
    submissionName: string
    statePrograms: Program[]
    onDocumentError?: (error: true) => void
}

export function renderDownloadButton(
    zippedFilesURL: string | undefined | Error
) {
    if (zippedFilesURL instanceof Error) {
        return (
            <InlineDocumentWarning message="Rate document download is unavailable" />
        )
    }
    return (
        <DownloadButton
            text="Download all rate documents"
            zippedFilesURL={zippedFilesURL}
        />
    )
}

export const RateDetailsSummarySection = ({
    submission,
    editNavigateTo,
    documentDateLookupTable,
    isCMSUser,
    submissionName,
    statePrograms,
    onDocumentError,
}: RateDetailsSummarySectionProps): React.ReactElement => {
    const [packageNamesLookup, setPackageNamesLookup] =
        React.useState<PackageNamesLookupType | null>(null)

    const isSubmitted = submission.status === 'SUBMITTED'
    const isEditing = !isSubmitted && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()

    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)

    // Return refreshed package names for state  - used rates across submissions feature
    // Use package name from api if available, otherwise use packageName coming down from proto as fallback
    // Display package name appended with text "Draft" when CMS user loads page properly (no errors) but refreshed name is not available
    const refreshPackagesWithSharedRateCert = (
        rateInfo: RateInfoType
    ): SharedRateCertDisplay[] | undefined => {
        return rateInfo.packagesWithSharedRateCerts?.map(
            ({ packageId, packageName }) => {
                const refreshedName =
                    packageId &&
                    packageNamesLookup &&
                    packageNamesLookup[packageId]?.packageName
                const isDraftText =
                    isCMSUser && !refreshedName && !indexPackagesError
                        ? ' (Draft)'
                        : ''
                return {
                    packageId,
                    packageName:
                        refreshedName ?? `${packageName}${isDraftText}`,
                }
            }
        )
    }

    // Request updated rate packages and names for the state  -  used in rates across submissions feature
    const {
        error: indexPackagesError,
        data,
        loading,
    } = useIndexHealthPlanPackagesQuery()
    const refreshedPackagesLookup = data?.indexHealthPlanPackages.edges.reduce(
        (acc, edge) => {
            const pkg = edge.node
            const currentRevisionPackageOrError =
                getCurrentRevisionFromHealthPlanPackage(pkg)
            if (currentRevisionPackageOrError instanceof Error) {
                recordJSException(
                    `indexHealthPlanPackagesQuery: Error decoding proto. ID: ${pkg.id}`
                )
                return acc
            }

            const [_, currentSubmissionData] = currentRevisionPackageOrError

            acc[pkg.id] = {
                packageName: packageName(
                    currentSubmissionData.stateCode,
                    currentSubmissionData.stateNumber,
                    currentSubmissionData.programIDs,
                    statePrograms
                ),
                status: pkg.status,
            }

            return acc
        },
        {} as PackageNamesLookupType
    )

    useEffect(() => {
        if (!packageNamesLookup && refreshedPackagesLookup) {
            setPackageNamesLookup(refreshedPackagesLookup)
        }
    }, [refreshedPackagesLookup, packageNamesLookup])

    if (indexPackagesError) {
        recordJSException(
            `indexHealthPlanPackagesQuery: Error querying health plan packages. ID: ${submission.id} Error message: ${indexPackagesError.message}`
        )
        // No displayed error state, we fall back to proto stored names for potential shared rate packages
    }

    const rateCapitationType = (rateInfo: RateInfoType) =>
        rateInfo.rateCapitationType
            ? rateInfo.rateCapitationType === 'RATE_CELL'
                ? 'Certification of capitation rates specific to each rate cell'
                : 'Certification of rate ranges of capitation rates per rate cell'
            : ''

    const ratePrograms = (
        submission: HealthPlanFormDataType,
        rateInfo: RateInfoType
    ) => {
        /* if we have rateProgramIDs, use them, otherwise use programIDs */
        let programIDs = [] as string[]
        if (rateInfo.rateProgramIDs && rateInfo.rateProgramIDs.length > 0) {
            programIDs = rateInfo.rateProgramIDs
        } else if (submission.programIDs && submission.programIDs.length > 0) {
            programIDs = submission.programIDs
        }
        return programIDs
            ? statePrograms
                  .filter((p) => programIDs.includes(p.id))
                  .map((p) => p.name)
            : undefined
    }

    const rateCertificationType = (rateInfo: RateInfoType) => {
        if (rateInfo.rateType === 'AMENDMENT') {
            return 'Amendment to prior rate certification'
        }
        if (rateInfo.rateType === 'NEW') {
            return 'New rate certification'
        }
    }

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission or draft
        if (!isSubmitted || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = submission.rateInfos
                .flatMap((rateInfo) =>
                    rateInfo.rateDocuments.concat(rateInfo.supportingDocuments)
                )
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                submissionName + '-rate-details.zip',
                'HEALTH_PLAN_DOCS'
            )
            if (zippedURL instanceof Error) {
                const msg = `ERROR: getBulkDlURL failed to generate supporting document URL. ID: ${submission.id} Message: ${zippedURL}`
                console.info(msg)

                if (onDocumentError) {
                    onDocumentError(true)
                }

                recordJSException(msg)
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [
        getKey,
        getBulkDlURL,
        submission,
        submissionName,
        isSubmitted,
        isPreviousSubmission,
    ])

    return (
        <SectionCard id="rateDetails" className={styles.summarySection}>
            <SectionHeader
                header="Rate details"
                editNavigateTo={editNavigateTo}
            >
                {isSubmitted &&
                    !isPreviousSubmission &&
                    renderDownloadButton(zippedFilesURL)}
            </SectionHeader>
            {submission.rateInfos.length > 0 ? (
                submission.rateInfos.map((rateInfo) => {
                    return (
                        <SectionCard
                            id={`rate-details-${rateInfo.id}`}
                            key={rateInfo.id}
                        >
                            <h3
                                aria-label={`Rate ID: ${rateInfo.rateCertificationName}`}
                                className={styles.rateName}
                            >
                                {rateInfo.rateCertificationName}
                            </h3>
                            <dl>
                                <DoubleColumnGrid>
                                    {ratePrograms && (
                                        <DataDetail
                                            id="ratePrograms"
                                            label="Programs this rate certification covers"
                                            explainMissingData={!isSubmitted}
                                            children={ratePrograms(
                                                submission,
                                                rateInfo
                                            )}
                                        />
                                    )}
                                    <DataDetail
                                        id="rateType"
                                        label="Rate certification type"
                                        explainMissingData={!isSubmitted}
                                        children={rateCertificationType(
                                            rateInfo
                                        )}
                                    />
                                    <DataDetail
                                        id="ratingPeriod"
                                        label={
                                            rateInfo.rateType === 'AMENDMENT'
                                                ? 'Rating period of original rate certification'
                                                : 'Rating period'
                                        }
                                        explainMissingData={!isSubmitted}
                                        children={
                                            rateInfo.rateDateStart &&
                                            rateInfo.rateDateEnd ? (
                                                `${formatCalendarDate(
                                                    rateInfo.rateDateStart
                                                )} to ${formatCalendarDate(
                                                    rateInfo.rateDateEnd
                                                )}`
                                            ) : (
                                                <DataDetailMissingField />
                                            )
                                        }
                                    />
                                    <DataDetail
                                        id="dateCertified"
                                        label={
                                            rateInfo.rateAmendmentInfo
                                                ? 'Date certified for rate amendment'
                                                : 'Date certified'
                                        }
                                        explainMissingData={!isSubmitted}
                                        children={formatCalendarDate(
                                            rateInfo.rateDateCertified
                                        )}
                                    />
                                    {rateInfo.rateAmendmentInfo ? (
                                        <DataDetail
                                            id="effectiveRatingPeriod"
                                            label="Rate amendment effective dates"
                                            explainMissingData={!isSubmitted}
                                            children={`${formatCalendarDate(
                                                rateInfo.rateAmendmentInfo
                                                    .effectiveDateStart
                                            )} to ${formatCalendarDate(
                                                rateInfo.rateAmendmentInfo
                                                    .effectiveDateEnd
                                            )}`}
                                        />
                                    ) : null}
                                    {rateInfo.actuaryContacts[0] && (
                                        <DataDetail
                                            id="certifyingActuary"
                                            label="Certifying actuary"
                                            explainMissingData={!isSubmitted}
                                            children={
                                                <DataDetailContactField
                                                    contact={
                                                        rateInfo
                                                            .actuaryContacts[0]
                                                    }
                                                />
                                            }
                                        />
                                    )}
                                    <DataDetail
                                        id="rateCapitationType"
                                        label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                                        explainMissingData={!isSubmitted}
                                        children={rateCapitationType(rateInfo)}
                                    />
                                </DoubleColumnGrid>
                            </dl>
                            {!loading ? (
                                <UploadedDocumentsTable
                                    documents={convertToGenericDocuments(
                                        rateInfo.rateDocuments,
                                        documentDateLookupTable
                                    )}
                                    packagesWithSharedRateCerts={refreshPackagesWithSharedRateCert(
                                        rateInfo
                                    )}
                                    multipleDocumentsAllowed={false}
                                    caption="Rate certification"
                                    documentCategory="Rate certification"
                                    isEditing={isEditing}
                                    isSubmitted={isSubmitted}
                                />
                            ) : (
                                <span className="srOnly">'LOADING...'</span>
                            )}
                            {!loading ? (
                                <UploadedDocumentsTable
                                    documents={convertToGenericDocuments(
                                        rateInfo.supportingDocuments,
                                        documentDateLookupTable
                                    )}
                                    packagesWithSharedRateCerts={refreshPackagesWithSharedRateCert(
                                        rateInfo
                                    )}
                                    caption="Rate supporting documents"
                                    isSupportingDocuments
                                    documentCategory="Rate-supporting"
                                />
                            ) : (
                                <span className="srOnly">'LOADING...'</span>
                            )}
                        </SectionCard>
                    )
                })
            ) : (
                <DataDetailMissingField />
            )}
        </SectionCard>
    )
}
