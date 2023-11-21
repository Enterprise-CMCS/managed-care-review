import React, { useEffect, useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../SectionHeader'
import { DownloadButton } from '../../DownloadButton'
import { Link } from '@trussworks/react-uswds'
import { useS3 } from '../../../contexts/S3Context'
import {
    HealthPlanFormDataType,
    SubmissionDocument,
} from '../../../common-code/healthPlanFormDataType'
import { recordJSException } from '../../../otelHelpers'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../DocumentWarning'
import { SectionCard } from '../../SectionCard'

type DocumentWithLink = { url: string | null } & SubmissionDocument

export type SupportingDocumentsSummarySectionProps = {
    submission: HealthPlanFormDataType
    editNavigateTo?: string
    submissionName?: string
    onDocumentError?: (error: true) => void
}
const getUncategorizedDocuments = (
    documents: SubmissionDocument[]
): SubmissionDocument[] =>
    documents.filter(
        (doc) => !doc.documentCategories || doc.documentCategories.length === 0
    )

function renderDownloadButton(zippedFilesURL: string | undefined | Error) {
    if (zippedFilesURL instanceof Error) {
        return (
            <InlineDocumentWarning message="Supporting document download is unavailable" />
        )
    }
    return (
        <DownloadButton
            text="Download all supporting documents"
            zippedFilesURL={zippedFilesURL}
        />
    )
}

// This component is only used for supporting docs that are not categorized (not expected behavior but still possible)
// since supporting documents are now displayed in the rate and contract sections
export const SupportingDocumentsSummarySection = ({
    submission,
    editNavigateTo,
    submissionName,
    onDocumentError,
}: SupportingDocumentsSummarySectionProps): React.ReactElement | null => {
    const { getURL, getKey, getBulkDlURL } = useS3()
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
    const isSubmitted = submission.status === 'SUBMITTED'
    useEffect(() => {
        const refreshDocuments = async () => {
            const uncategorizedDocuments = getUncategorizedDocuments(
                submission.documents
            )

            const newDocuments = await Promise.all(
                uncategorizedDocuments.map(async (doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key)
                        return {
                            ...doc,
                            url: null,
                        }

                    const documentLink = await getURL(key, 'HEALTH_PLAN_DOCS')
                    return {
                        ...doc,
                        url: documentLink,
                    }
                })
            ).catch((err) => {
                console.info(err)
                return []
            })

            setRefreshedDocs(newDocuments)
        }

        void refreshDocuments()
    }, [submission, getKey, getURL])

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission, draft or no uncategorized supporting documents
        if (!isSubmitted || refreshedDocs.length === 0) return

        // get all the keys for the documents we want to zip
        const uncategorizedDocuments = getUncategorizedDocuments(
            submission.documents
        )

        async function fetchZipUrl() {
            const keysFromDocs = uncategorizedDocuments
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                submissionName + '-supporting-documents.zip',
                'HEALTH_PLAN_DOCS'
            )

            if (zippedURL instanceof Error) {
                const msg = `ERROR: getBulkDlURL failed to generate contract document URL. ID: ${submission.id} Message: ${zippedURL}`
                console.info(msg)

                if (onDocumentError) {
                    onDocumentError(true)
                }

                recordJSException(msg)
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [getKey, getBulkDlURL, submission, submissionName, isSubmitted])

    const documentsSummary = `${refreshedDocs.length} ${
        refreshedDocs.length === 1 ? 'file' : 'files'
    }`
    // when there are no uncategorized supporting documents, remove this section entirely
    if (refreshedDocs.length === 0) return null

    return (
        <SectionCard id="documents" className={styles.summarySection}>
            <SectionHeader
                header="Supporting documents"
                editNavigateTo={editNavigateTo}
            >
                {isSubmitted && renderDownloadButton(zippedFilesURL)}
            </SectionHeader>
            <span className="text-bold">{documentsSummary}</span>
            <ul>
                {refreshedDocs.map((doc) => (
                    <li key={doc.name}>
                        {doc.url ? (
                            <Link
                                aria-label={`${doc.name} (opens in new window)`}
                                href={doc.url}
                                variant="external"
                                target="_blank"
                            >
                                {doc.name}
                            </Link>
                        ) : (
                            <span>{doc.name}</span>
                        )}
                    </li>
                ))}
            </ul>
        </SectionCard>
    )
}
