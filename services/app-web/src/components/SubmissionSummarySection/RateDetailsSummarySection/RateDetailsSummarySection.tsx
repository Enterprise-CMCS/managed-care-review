import { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../dateHelpers'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import styles from '../SubmissionSummarySection.module.scss'

export type RateDetailsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
    disableDownload?: boolean
}

export const RateDetailsSummarySection = ({
    submission,
    navigateTo,
    disableDownload,
}: RateDetailsSummarySectionProps): React.ReactElement => {
    const isSubmitted = submission.__typename === 'StateSubmission'
    const isEditing = !isSubmitted && navigateTo !== undefined
    // Get the zip file for the rate details
    const { getKey, getBulkDlURL } = useS3()
    useEffect(() => {
        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = submission.rateDocuments
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                submission.name + '-rate-details.zip'
            )
            if (zippedURL instanceof Error) {
                console.log('ERROR: TODO: DISPLAY AN ERROR MESSAGE')
                return
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [getKey, getBulkDlURL, submission])
    const [zippedFilesURL, setZippedFilesURL] = useState<string>('')
    const rateSupportingDocuments = submission.documents.filter((doc) =>
        doc.documentCategories.includes('RATES_RELATED')
    )
    return (
        <section id="rateDetails" className={styles.summarySection}>
            <dl>
                <SectionHeader header="Rate details" navigateTo={navigateTo}>
                    {isSubmitted && !disableDownload && (
                        <DownloadButton
                            text="Download all rate documents"
                            zippedFilesURL={zippedFilesURL}
                        />
                    )}
                </SectionHeader>

                <DoubleColumnGrid>
                    <DataDetail
                        id="rateType"
                        label="Rate certification type"
                        data={
                            submission.rateAmendmentInfo
                                ? 'Amendment to prior rate certification'
                                : 'New rate certification'
                        }
                    />
                    <DataDetail
                        id="ratingPeriod"
                        label={
                            submission.rateAmendmentInfo
                                ? 'Rating period of original rate certification'
                                : 'Rating period'
                        }
                        data={`${formatCalendarDate(
                            submission.rateDateStart
                        )} to ${formatCalendarDate(submission.rateDateEnd)}`}
                    />
                    <DataDetail
                        id="dateCertified"
                        label={
                            submission.rateAmendmentInfo
                                ? 'Date certified for rate amendment'
                                : 'Date certified'
                        }
                        data={formatCalendarDate(submission.rateDateCertified)}
                    />
                    {submission.rateAmendmentInfo ? (
                        <DataDetail
                            id="effectiveRatingPeriod"
                            label="Rate amendment effective dates"
                            data={`${formatCalendarDate(
                                submission.rateAmendmentInfo.effectiveDateStart
                            )} to ${formatCalendarDate(
                                submission.rateAmendmentInfo.effectiveDateEnd
                            )}`}
                        />
                    ) : null}
                </DoubleColumnGrid>
            </dl>
            <UploadedDocumentsTable
                documents={submission.rateDocuments}
                caption="Rate certification"
                documentCategory="Rate certification"
            />
            <UploadedDocumentsTable
                documents={rateSupportingDocuments}
                caption="Rate supporting documents"
                documentCategory="Rate-supporting"
                isSupportingDocuments
                isEditing={isEditing}
            />
        </section>
    )
}
