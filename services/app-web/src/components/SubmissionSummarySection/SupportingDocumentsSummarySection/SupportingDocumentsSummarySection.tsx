import React, { useEffect, useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { Document } from '../../../gen/gqlClient'
import { SectionHeader } from '../../SectionHeader'
import { DownloadButton } from '../../DownloadButton'
import { Link } from '@trussworks/react-uswds'
import { useS3 } from '../../../contexts/S3Context'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'

type DocumentWithLink = { url: string | null } & Document

export type SupportingDocumentsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

// This component is only used for supporting docs that are not categorized (not expected behavior but still possible)
// since supporting documents are now displayed in the rate and contract sections 
export const SupportingDocumentsSummarySection = ({
    submission,
    navigateTo,
}: SupportingDocumentsSummarySectionProps): React.ReactElement| null => {
    const { getURL, getKey, getBulkDlURL } = useS3()
    useEffect(() => {
        const refreshDocuments = async () => {
                const uncategorizedDocuments = submission.documents.filter(
                    (doc) => doc.documentCategories === []
                )
            const newDocuments = await Promise.all(
                uncategorizedDocuments.map(async (doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key)
                        return {
                            ...doc,
                            url: null,
                        }

                    const documentLink = await getURL(key)
                    return {
                        ...doc,
                        url: documentLink,
                    }
                })
            ).catch((err) => {
                console.log(err)
                return []
            })
            setRefreshedDocs(newDocuments)
        }

        void refreshDocuments()
    }, [submission, getKey, getURL])

    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])

    const documentsSummary = `${refreshedDocs.length} ${
        refreshedDocs.length === 1 ? 'file' : 'files'
    }`

    useEffect(() => {
        // get all the keys for the documents we want to zip
            const uncategorizedDocuments = submission.documents.filter(
                (doc) => doc.documentCategories === []
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
                submission.name + '-supporting-documents.zip'
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
    const isSubmitted = submission.__typename === 'StateSubmission'
    // when there are no uncategorized supporting documents, remove this section entirely
    if (!refreshedDocs) return null

    return (
        <section id="documents" className={styles.summarySection}>
            <SectionHeader
                header="Supporting documents"
                navigateTo={navigateTo}
            >
                {isSubmitted && (
                    <DownloadButton
                        text="Download all supporting documents"
                        zippedFilesURL={zippedFilesURL}
                    />
                )}
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
        </section>
    )
}
