import React, { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import {
    getActuaryFirm,
    UploadedDocumentsTable,
} from '../../../components/SubmissionSummarySection'
import { DocumentDateLookupTable } from '../../../pages/SubmissionSummary/SubmissionSummary'
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
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { useIndexHealthPlanPackagesQuery } from '../../../gen/gqlClient'
import { recordJSException } from '../../../otelHelpers'
import { featureFlags } from '../../../common-code/featureFlags'
import { Link } from '@trussworks/react-uswds'
import { getCurrentRevisionFromHealthPlanPackage } from '../../../gqlHelpers'
import { SharedRateCertDisplay } from '../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'

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
    navigateTo?: string
    documentDateLookupTable?: DocumentDateLookupTable
    isCMSUser?: boolean
    submissionName: string
    statePrograms: Program[]
}

export const RateDetailsSummarySection = ({
    submission,
    navigateTo,
    documentDateLookupTable,
    isCMSUser,
    submissionName,
    statePrograms,
}: RateDetailsSummarySectionProps): React.ReactElement => {
    const [packageNamesLookup, setPackageNamesLookup] =
        React.useState<PackageNamesLookupType | null>(null)

    // Launch Darkly
    const ldClient = useLDClient()
    const showMultiRates = ldClient?.variation(
        featureFlags.MULTI_RATE_SUBMISSIONS.flag,
        featureFlags.MULTI_RATE_SUBMISSIONS.defaultValue
    )
    const isSubmitted = submission.status === 'SUBMITTED'
    const isEditing = !isSubmitted && navigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()

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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [currentRevision, currentSubmissionData] =
                currentRevisionPackageOrError

            // Exclude active submission package and contract_only from list.
            if (
                currentSubmissionData.submissionType === 'CONTRACT_AND_RATES' &&
                currentRevision.submitInfo?.updatedAt &&
                pkg.id
            ) {
                acc[pkg.id] = {
                    packageName: packageName(
                        currentSubmissionData,
                        statePrograms
                    ),
                    status: pkg.status,
                }
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

    // Get the zip file for the rate details
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<string>('')
    const rateSupportingDocuments = submission.documents.filter((doc) =>
        doc.documentCategories.includes('RATES_RELATED')
    )

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

    useEffect(() => {
        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = submission.rateInfos
                .flatMap((rateInfo) => rateInfo.rateDocuments)
                .concat(rateSupportingDocuments)
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                submissionName + '-rate-details.zip'
            )
            if (zippedURL instanceof Error) {
                console.log('ERROR: TODO: DISPLAY AN ERROR MESSAGE')
                return
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [
        getKey,
        getBulkDlURL,
        submission,
        rateSupportingDocuments,
        submissionName,
    ])

    return (
        <section id="rateDetails" className={styles.summarySection}>
            <dl>
                <SectionHeader header="Rate details" navigateTo={navigateTo}>
                    {isSubmitted && !isPreviousSubmission && (
                        <DownloadButton
                            text="Download all rate documents"
                            zippedFilesURL={zippedFilesURL}
                        />
                    )}
                </SectionHeader>
                {submission.rateInfos.map((rateInfo) => {
                    return (
                        <React.Fragment
                            key={`${
                                rateInfo.rateCertificationName
                            }${JSON.stringify(rateInfo.rateDocuments)}`}
                        >
                            <h3
                                aria-label={`Rate ID: ${rateInfo.rateCertificationName}`}
                                className={styles.rateName}
                            >
                                {rateInfo.rateCertificationName}
                            </h3>
                            <DoubleColumnGrid>
                                {ratePrograms && (
                                    <DataDetail
                                        id="ratePrograms"
                                        label="Programs this rate certification covers"
                                        data={ratePrograms(
                                            submission,
                                            rateInfo
                                        )}
                                    />
                                )}
                                <DataDetail
                                    id="rateType"
                                    label="Rate certification type"
                                    data={rateCertificationType(rateInfo)}
                                />
                                <DataDetail
                                    id="rateCapitationType"
                                    label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                                    data={rateCapitationType(rateInfo)}
                                />
                                <DataDetail
                                    id="ratingPeriod"
                                    label={
                                        rateInfo.rateType === 'AMENDMENT'
                                            ? 'Rating period of original rate certification'
                                            : 'Rating period'
                                    }
                                    data={`${formatCalendarDate(
                                        rateInfo.rateDateStart
                                    )} to ${formatCalendarDate(
                                        rateInfo.rateDateEnd
                                    )}`}
                                />
                                <DataDetail
                                    id="dateCertified"
                                    label={
                                        rateInfo.rateAmendmentInfo
                                            ? 'Date certified for rate amendment'
                                            : 'Date certified'
                                    }
                                    data={formatCalendarDate(
                                        rateInfo.rateDateCertified
                                    )}
                                />
                                {rateInfo.rateAmendmentInfo ? (
                                    <DataDetail
                                        id="effectiveRatingPeriod"
                                        label="Rate amendment effective dates"
                                        data={`${formatCalendarDate(
                                            rateInfo.rateAmendmentInfo
                                                .effectiveDateStart
                                        )} to ${formatCalendarDate(
                                            rateInfo.rateAmendmentInfo
                                                .effectiveDateEnd
                                        )}`}
                                    />
                                ) : null}
                                {showMultiRates && rateInfo.actuaryContacts[0] && (
                                    <div
                                        className={
                                            styles.certifyingActuaryDetail
                                        }
                                    >
                                        <dt
                                            id="certifyingActuary"
                                            className="text-bold"
                                        >
                                            Certifying actuary
                                        </dt>
                                        <dd
                                            role="definition"
                                            aria-labelledby="certifyingActuary"
                                        >
                                            <address>
                                                {
                                                    rateInfo.actuaryContacts[0]
                                                        .name
                                                }
                                                <br />
                                                {
                                                    rateInfo.actuaryContacts[0]
                                                        .titleRole
                                                }
                                                <br />
                                                <Link
                                                    href={`mailto:${rateInfo.actuaryContacts[0].email}`}
                                                    target="_blank"
                                                    variant="external"
                                                    rel="noreferrer"
                                                >
                                                    {
                                                        rateInfo
                                                            .actuaryContacts[0]
                                                            .email
                                                    }
                                                </Link>
                                                <br />
                                                {getActuaryFirm(
                                                    rateInfo.actuaryContacts[0]
                                                )}
                                            </address>
                                        </dd>
                                    </div>
                                )}
                            </DoubleColumnGrid>
                            {!loading ? (
                                <UploadedDocumentsTable
                                    documents={rateInfo.rateDocuments}
                                    packagesWithSharedRateCerts={refreshPackagesWithSharedRateCert(
                                        rateInfo
                                    )}
                                    documentDateLookupTable={
                                        documentDateLookupTable
                                    }
                                    isCMSUser={isCMSUser}
                                    caption="Rate certification"
                                    documentCategory="Rate certification"
                                />
                            ) : (
                                <span className="srOnly">'LOADING...'</span>
                            )}
                        </React.Fragment>
                    )
                })}
            </dl>
            <UploadedDocumentsTable
                documents={rateSupportingDocuments}
                documentDateLookupTable={documentDateLookupTable}
                isCMSUser={isCMSUser}
                caption="Rate supporting documents"
                documentCategory="Rate-supporting"
                isSupportingDocuments
                isEditing={isEditing}
            />
        </section>
    )
}
