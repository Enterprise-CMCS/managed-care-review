import React, { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { DocumentDateLookupTable } from '../../../pages/SubmissionSummary/SubmissionSummary'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { generateRateName } from '../../../common-code/healthPlanFormDataType'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    HealthPlanFormDataType,
    RateInfoType,
} from '../../../common-code/healthPlanFormDataType'
import { Program } from '../../../gen/gqlClient'

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
    const isSubmitted = submission.status === 'SUBMITTED'
    const isEditing = !isSubmitted && navigateTo !== undefined
    //Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
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
    /* falling back to generated name for old submissions that don't have the name on first load */
    const rateName = (rateInfo: RateInfoType) => {
        const certName = rateInfo.rateCertificationName
        const generatedName = generateRateName(
            submission,
            rateInfo,
            statePrograms
        )
        if (certName) {
            return certName
        } else if (generatedName) {
            return generatedName
        } else {
            return undefined
        }
    }

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
            const keysFromDocs = submission.rateDocuments
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
                {submission.rateInfos.map((rateInfo, index) => {
                    return (
                        <React.Fragment
                            key={`${rateName(rateInfo)}${JSON.stringify(
                                rateInfo.rateDocuments
                            )}`}
                        >
                            <h3
                                aria-label={`Rate ID: ${rateName(rateInfo)}`}
                                className={styles.rateName}
                            >
                                {rateName(rateInfo)}
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
                            </DoubleColumnGrid>
                            <UploadedDocumentsTable
                                documents={rateInfo.rateDocuments}
                                documentDateLookupTable={
                                    documentDateLookupTable
                                }
                                isCMSUser={isCMSUser}
                                caption="Rate certification"
                                documentCategory="Rate certification"
                            />
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
