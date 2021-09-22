import React, { useEffect, useState } from 'react'
import styles from '../SubmissionSummaryCard.module.scss'
import { Document } from '../../../gen/gqlClient'
import {
    SubmissionSummaryCardProps,
    CardHeader,
} from '../SubmissionSummaryCard'
import { Link } from '@trussworks/react-uswds'
import { useS3 } from '../../../contexts/S3Context'

type DocumentWithLink = { url: string | null } & Document

export const DocumentsSummaryCard = ({
    submission,
    editable,
    to,
}: SubmissionSummaryCardProps): React.ReactElement => {
    const { getURL, getKey } = useS3()

    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocs = await Promise.all(
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
            setRefreshedDocs(newDocs)
        }

        void refreshDocuments()
    }, [submission.documents, getKey, getURL])

    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])

    const documentsSummary = `${submission.documents.length} ${
        submission.documents.length === 1 ? 'file' : 'files'
    }`

    return (
        <section id="documents" className={styles.reviewSection}>
            <CardHeader header="Documents" editable={editable} to={to} />
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
