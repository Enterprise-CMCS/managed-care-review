import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../../components/SectionHeader'
import { Link, Grid } from '@trussworks/react-uswds'
import { DataDetail } from '../../../components/DataDetail'
import { DoubleColumnRow } from '../../../components/DoubleColumnRow'
import {
    Document,
    DraftSubmission,
    StateSubmission,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'

type DocumentWithLink = { url: string | null } & Document

export type RateDetailsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

export const RateDetailsSummarySection = ({
    submission,
    navigateTo,
}: RateDetailsSummarySectionProps): React.ReactElement => {
    const { getURL, getKey } = useS3()
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocuments = await Promise.all(
                submission.rateDocuments.map(async (doc) => {
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

    return (
        <section id="rateDetails" className={styles.summarySection}>
            <dl>
                <SectionHeader header="Rate details" navigateTo={navigateTo} />
                <DoubleColumnRow
                    left={
                        <DataDetail
                            id="rateType"
                            label="Rate certification type"
                            data={
                                submission.rateAmendmentInfo
                                    ? 'Amendment to prior rate certification'
                                    : 'New rate certification'
                            }
                        />
                    }
                    right={
                        <DataDetail
                            id="ratingPeriod"
                            label={
                                submission.rateAmendmentInfo
                                    ? 'Rating period of original rate certification'
                                    : 'Rating period'
                            }
                            data={`${dayjs(submission.rateDateStart).format(
                                'MM/DD/YYYY'
                            )} - ${dayjs(submission.rateDateEnd).format(
                                'MM/DD/YYYY'
                            )}`}
                        />
                    }
                />
                <DoubleColumnRow
                    left={
                        <DataDetail
                            id="dateCertified"
                            label={
                                submission.rateAmendmentInfo
                                    ? 'Date certified for rate amendment'
                                    : 'Date certified'
                            }
                            data={dayjs(submission.rateDateCertified).format(
                                'MM/DD/YYYY'
                            )}
                        />
                    }
                    right={
                        submission.rateAmendmentInfo ? (
                            <DataDetail
                                id="effectiveRatingPeriod"
                                label="Effective dates of rate amendment"
                                data={`${dayjs(
                                    submission.rateAmendmentInfo
                                        .effectiveDateStart
                                ).format('MM/DD/YYYY')} - ${dayjs(
                                    submission.rateAmendmentInfo
                                        .effectiveDateEnd
                                ).format('MM/DD/YYYY')}`}
                            />
                        ) : null
                    }
                />
            </dl>

            <table className={styles.documentsList}>
                <caption className="text-bold">Rate certification</caption>
                <thead>
                    <tr>
                        <th scope="col">Document name</th>
                        <th scope="col">Date uploaded</th>
                        <th scope="col">Document category</th>
                    </tr>
                </thead>
                <tbody>
                    {refreshedDocs.map((doc) => (
                        <tr key={doc.name}>
                            {doc.url ? (
                                <td>
                                    <Link
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        variant="external"
                                        target="_blank"
                                    >
                                        {doc.name}
                                    </Link>
                                </td>
                            ) : (
                                <td>{doc.name}</td>
                            )}
                            <td></td>
                            <td>Rate certification</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}
