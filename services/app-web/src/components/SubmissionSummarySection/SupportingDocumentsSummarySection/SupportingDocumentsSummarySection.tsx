import React, { useEffect, useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { Document } from '../../../gen/gqlClient'
import { SectionHeader } from '../../SectionHeader'
import { Link } from '@trussworks/react-uswds'
import { useS3 } from '../../../contexts/S3Context'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'

type DocumentWithLink = { url: string | null } & Document

export type SupportingDocumentsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

export const SupportingDocumentsSummarySection = ({
    submission,
    navigateTo,
}: SupportingDocumentsSummarySectionProps): React.ReactElement => {
    const { getURL, getKey, getBulkDlURL } = useS3()
    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocuments = await Promise.all(
                submission.documents.map(async (doc) => {
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
        async function fetchZipUrl() {
            const keysFromDocs = submission.documents
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

    return (
        <section id="documents" className={styles.summarySection}>
            <SectionHeader
                header="Supporting documents"
                navigateTo={navigateTo}
            />
            <div>
                {zippedFilesURL ? (
                    <Link
                        variant="external"
                        href={zippedFilesURL}
                        target="_blank"
                    >
                        {'Download all supporting documents'}
                    </Link>
                ) : (
                    <span>{}</span>
                )}
            </div>
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
