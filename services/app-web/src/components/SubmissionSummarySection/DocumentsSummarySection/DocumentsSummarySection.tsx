import React, { useEffect, useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { Document } from '../../../gen/gqlClient'
import { SectionHeader } from '../../../components/SectionHeader'
import { Link } from '@trussworks/react-uswds'
import { useS3 } from '../../../contexts/S3Context'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'

type DocumentWithLink = { url: string | null } & Document

export type DocumentsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

export const DocumentsSummarySection = ({
    submission,
    navigateTo,
}: DocumentsSummarySectionProps): React.ReactElement => {
    const { getURL, getKey } = useS3()
    useEffect(() => {
        const mergedDocuments = submission.rateDocuments
            ? submission.documents.concat(
                  submission.contractDocuments,
                  submission.rateDocuments
              )
            : submission.documents.concat(submission.contractDocuments)
        const refreshDocuments = async () => {
            const newDocs = await Promise.all(
                mergedDocuments.map(async (doc) => {
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
            setRefreshedDocs(newDocs)
        }

        void refreshDocuments()
    }, [submission, getKey, getURL])

    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])

    const documentsSummary = `${refreshedDocs.length} ${
        refreshedDocs.length === 1 ? 'file' : 'files'
    }`

    return (
        <section id="documents" className={styles.summarySection}>
            <SectionHeader header="Documents" navigateTo={navigateTo} />
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
