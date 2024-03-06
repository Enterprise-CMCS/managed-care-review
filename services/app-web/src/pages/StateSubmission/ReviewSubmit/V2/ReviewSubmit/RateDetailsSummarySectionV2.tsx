import React, { useState } from 'react'
import { DataDetail } from '../../../../../components/DataDetail'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { useS3 } from '../../../../../contexts/S3Context'
import { formatCalendarDate } from '../../../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../../../../components/DoubleColumnGrid'
import { DownloadButton } from '../../../../../components/DownloadButton'
import { UploadedDocumentsTable } from '../../../../../components/SubmissionSummarySection'
import { usePreviousSubmission } from '../../../../../hooks/usePreviousSubmission'
import styles from '../../../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'

import { recordJSException } from '../../../../../otelHelpers'
import { DataDetailMissingField } from '../../../../../components/DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../../../../components/DataDetail/DataDetailContactField/DataDetailContactField'
import { DocumentDateLookupTableType } from '../../../../../documentHelpers/makeDocumentDateLookupTable'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../../../components/DocumentWarning'
import { SectionCard } from '../../../../../components/SectionCard'
import {
    Rate,
    Contract,
    Program,
    RateRevision,
} from '../../../../../gen/gqlClient'

export type RateDetailsSummarySectionV2Props = {
    contract: Contract
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

export const RateDetailsSummarySectionV2 = ({
    contract,
    editNavigateTo,
    documentDateLookupTable,
    submissionName,
    statePrograms,
    onDocumentError,
}: RateDetailsSummarySectionV2Props): React.ReactElement => {
    const isSubmitted = contract.status === 'SUBMITTED'
    const isEditing = !isSubmitted && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()
    const contractFormData =
        contract.draftRevision?.formData ||
        contract.packageSubmissions[0].contractRevision.formData
    const rates =
        contract.draftRates || contract.packageSubmissions[0].rateRevisions
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)

    const rateCapitationType = (rate: Rate | RateRevision) => {
        const rateFormData = getRateFormData(rate)
        return rateFormData?.rateCapitationType
            ? rateFormData.rateCapitationType === 'RATE_CELL'
                ? 'Certification of capitation rates specific to each rate cell'
                : 'Certification of rate ranges of capitation rates per rate cell'
            : ''
    }

    const ratePrograms = (rate: Rate | RateRevision) => {
        /* if we have rateProgramIDs, use them, otherwise use programIDs */
        let programIDs = [] as string[]
        const rateFormData = getRateFormData(rate)

        if (
            rateFormData?.rateProgramIDs &&
            rateFormData?.rateProgramIDs.length > 0
        ) {
            programIDs = rateFormData.rateProgramIDs
        } else if (
            contractFormData?.programIDs &&
            contractFormData?.programIDs.length > 0
        ) {
            programIDs = contractFormData.programIDs
        }
        return programIDs
            ? statePrograms
                  .filter((p) => programIDs.includes(p.id))
                  .map((p) => p.name)
            : undefined
    }

    const rateCertificationType = (rate: Rate | RateRevision) => {
        const rateFormData = getRateFormData(rate)
        if (rateFormData?.rateType === 'AMENDMENT') {
            return 'Amendment to prior rate certification'
        }
        if (rateFormData?.rateType === 'NEW') {
            return 'New rate certification'
        }
    }

    const getRateFormData = (rate: Rate | RateRevision) => {
        const isDraftRate = 'draftRevision' in rate
        const isRateRev = 'formData' in rate
        if (isDraftRate) {
            return rate.draftRevision?.formData
        } else if (isRateRev) {
            return rate.formData
        }
    }

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission or draft
        if (!isSubmitted || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const submittedRates = contract.packageSubmissions[0].rateRevisions
            if (submittedRates !== undefined) {
                const keysFromDocs = submittedRates
                    .flatMap((rateInfo) =>
                        rateInfo.formData.rateDocuments.concat(
                            rateInfo.formData.supportingDocuments
                        )
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
                    const msg = `ERROR: getBulkDlURL failed to generate supporting document URL. ID: ${contract.id} Message: ${zippedURL}`
                    console.info(msg)

                    if (onDocumentError) {
                        onDocumentError(true)
                    }

                    recordJSException(msg)
                }

                setZippedFilesURL(zippedURL)
            }
        }

        void fetchZipUrl()
    }, [
        getKey,
        getBulkDlURL,
        contract,
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
            {rates.length > 0 ? (
                rates.map((rate) => {
                    const rateFormData = getRateFormData(rate)
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
                                        children={rateCertificationType(rate)}
                                    />
                                    <DataDetail
                                        id="ratingPeriod"
                                        label={
                                            rateFormData?.rateType ===
                                            'AMENDMENT'
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
                                    {rateFormData
                                        ?.certifyingActuaryContacts[0] && (
                                        <DataDetail
                                            id="certifyingActuary"
                                            label="Certifying actuary"
                                            explainMissingData={!isSubmitted}
                                            children={
                                                <DataDetailContactField
                                                    contact={
                                                        rateFormData
                                                            ?.certifyingActuaryContacts[0]
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
                            {rateFormData?.rateDocuments && (
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
                            )}
                            {rateFormData?.supportingDocuments && (
                                <UploadedDocumentsTable
                                    documents={rateFormData.supportingDocuments}
                                    documentDateLookupTable={
                                        documentDateLookupTable
                                    }
                                    caption="Rate supporting documents"
                                    isSupportingDocuments
                                    documentCategory="Rate-supporting"
                                />
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
