import React, { useEffect, useState } from 'react'
import { DataDetail } from '../../../../../components/DataDetail'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../../../components/SubmissionSummarySection'
import { useS3 } from '../../../../../contexts/S3Context'
import { formatCalendarDate } from '../../../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../../../../components/DoubleColumnGrid'
import { DownloadButton } from '../../../../../components/DownloadButton'
import { usePreviousSubmission } from '../../../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    HealthPlanFormDataType,
    packageName,
    RateInfoType,
} from '../../../../../common-code/healthPlanFormDataType'
import { HealthPlanPackageStatus, Program } from '../../../../../gen/gqlClient'
import { useIndexHealthPlanPackagesQuery } from '../../../../../gen/gqlClient'
import { recordJSException } from '../../../../../otelHelpers'
import { getCurrentRevisionFromHealthPlanPackage } from '../../../../../gqlHelpers'
import { SharedRateCertDisplay } from '../../../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { DataDetailMissingField } from '../../../../../components/DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../../../../components/DataDetail/DataDetailContactField/DataDetailContactField'
import { DocumentDateLookupTableType } from '../../../../../documentHelpers/makeDocumentDateLookupTable'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../../../components/DocumentWarning'
import { SectionCard } from '../../../../../components/SectionCard'
import { Rate } from '../../../../../gen/gqlClient'

// Used for refreshed packages names keyed by their package id
// package name includes (Draft) for draft packages.
type PackageNameType = string
type PackageNamesLookupType = {
    [id: string]: {
        packageName: PackageNameType
        status: HealthPlanPackageStatus
    }
}

export type RateDetailsSummarySectionV2Props = {
    draftRates: Rate[]
    contractId: string,
    editNavigateTo?: string
    documentDateLookupTable: DocumentDateLookupTableType
    isCMSUser?: boolean
    isSubmitted?: boolean
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

export const RateDetailsSummarySectionV2 = ({
    draftRates,
    editNavigateTo,
    documentDateLookupTable,
    isCMSUser,
    submissionName,
    statePrograms,
    onDocumentError,
    contractId,
    isSubmitted
}: RateDetailsSummarySectionV2Props): React.ReactElement => {
    const isEditing = !isSubmitted && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()

    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)

    const rateCapitationType = (rate: Rate) =>
        rate.draftRevision?.formData.rateCapitationType
            ? rate.draftRevision?.formData.rateCapitationType === 'RATE_CELL'
                ? 'Certification of capitation rates specific to each rate cell'
                : 'Certification of rate ranges of capitation rates per rate cell'
            : ''

    const ratePrograms = (
        rate: Rate
    ) => {
        const programIDs = rate.draftRevision?.formData.rateProgramIDs
        return programIDs
            ? statePrograms
                  .filter((p) => programIDs.includes(p.id))
                  .map((p) => p.name)
            : undefined
    }

    const rateCertificationType = (rate: Rate) => {
        if (rate.draftRevision?.formData.rateType === 'AMENDMENT') {
            return 'Amendment to prior rate certification'
        }
        if (rate.draftRevision?.formData.rateType === 'NEW') {
            return 'New rate certification'
        }
    }

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission or draft
        if (!isSubmitted || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = draftRates
                .flatMap((rate) => {
                    if (rate.draftRevision) {
                        return rate.draftRevision.formData.rateDocuments.concat(rate.draftRevision.formData.supportingDocuments)
                    }
                })
                .map((doc) => {
                    if (doc) {
                        const key = getKey(doc.s3URL)
                        if (!key) return ''
                        return key
                    }
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                ['keysFromDocs'],
                submissionName + '-rate-details.zip',
                'HEALTH_PLAN_DOCS'
            )
            if (zippedURL instanceof Error) {
                const msg = `ERROR: getBulkDlURL failed to generate supporting document URL. ID: ${contractId} Message: ${zippedURL}`
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
        draftRates,
        submissionName,
        isSubmitted,
        isPreviousSubmission,
    ])

    const loading = ''

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
            {draftRates.length > 0 ? (
                draftRates.map((rate) => {
                    const rateFormData = rate.draftRevision?.formData
                    return (
                        <SectionCard
                            id={`rate-details-${rate.id}`}
                            key={rate.id}
                        >
                            <h3
                                aria-label={`Rate ID: ${rateFormData?.rateCertificationName}`}
                                className={styles.rateName}
                            >
                                {rateFormData?.rateCertificationName}
                            </h3>
                            <dl>
                                <DoubleColumnGrid>
                                    {ratePrograms && (
                                        <DataDetail
                                            id="ratePrograms"
                                            label="Programs this rate certification covers"
                                            explainMissingData={!isSubmitted}
                                            children={ratePrograms(rate)}
                                        />
                                    )}
                                    <DataDetail
                                        id="rateType"
                                        label="Rate certification type"
                                        explainMissingData={!isSubmitted}
                                        children={rateCertificationType(
                                            rate
                                        )}
                                    />
                                    <DataDetail
                                        id="ratingPeriod"
                                        label={
                                            rateFormData?.rateType === 'AMENDMENT'
                                                ? 'Rating period of original rate certification'
                                                : 'Rating period'
                                        }
                                        explainMissingData={!isSubmitted}
                                        children={
                                            rateFormData?.rateDateStart &&
                                            rateFormData?.rateDateEnd ? (
                                                `${formatCalendarDate(
                                                    rateFormData?.rateDateStart
                                                )} to ${formatCalendarDate(
                                                    rateFormData?.rateDateEnd
                                                )}`
                                            ) : (
                                                <DataDetailMissingField />
                                            )
                                        }
                                    />
                                    <DataDetail
                                        id="dateCertified"
                                        label={
                                            rateFormData?.amendmentEffectiveDateStart
                                                ? 'Date certified for rate amendment'
                                                : 'Date certified'
                                        }
                                        explainMissingData={!isSubmitted}
                                        children={formatCalendarDate(
                                            rateFormData?.rateDateCertified
                                        )}
                                    />
                                    {rateFormData?.amendmentEffectiveDateStart ? (
                                        <DataDetail
                                            id="effectiveRatingPeriod"
                                            label="Rate amendment effective dates"
                                            explainMissingData={!isSubmitted}
                                            children={`${formatCalendarDate(
                                                rateFormData?.amendmentEffectiveDateStart
                                            )} to ${formatCalendarDate(
                                                rateFormData?.amendmentEffectiveDateEnd
                                            )}`}
                                        />
                                    ) : null}
                                    {rateFormData?.certifyingActuaryContacts[0] && (
                                        <DataDetail
                                            id="certifyingActuary"
                                            label="Certifying actuary"
                                            explainMissingData={!isSubmitted}
                                            children={
                                                <DataDetailContactField
                                                    contact={
                                                        rateFormData?.certifyingActuaryContacts[0]
                                                    }
                                                />
                                            }
                                        />
                                    )}
                                    <DataDetail
                                        id="rateCapitationType"
                                        label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                                        explainMissingData={!isSubmitted}
                                        children={rateCapitationType(rate)}
                                    />
                                </DoubleColumnGrid>
                            </dl>
                            {!loading && rateFormData?.rateDocuments ? (
                                <UploadedDocumentsTable
                                    documents={rateFormData.rateDocuments}
                                    documentDateLookupTable={
                                        documentDateLookupTable
                                    }
                                    multipleDocumentsAllowed={false}
                                    caption="Rate certification"
                                    documentCategory="Rate certification"
                                    isEditing={isEditing}
                                    isSubmitted={isSubmitted}
                                />
                            ) : (
                                <span className="srOnly">'LOADING...'</span>
                            )}
                            {!loading && rateFormData?.supportingDocuments? (
                                <UploadedDocumentsTable
                                    documents={rateFormData.supportingDocuments}
                                    documentDateLookupTable={
                                        documentDateLookupTable
                                    }
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
