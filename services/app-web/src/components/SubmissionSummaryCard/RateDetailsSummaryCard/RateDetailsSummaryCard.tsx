import dayjs from 'dayjs'
import styles from '../SubmissionSummaryCard.module.scss'
import {
    SubmissionSummaryCardProps,
    CardHeader,
} from '../SubmissionSummaryCard'
import { DataDetail } from '../../DataDetail/DataDetail'
import { DoubleColumnRow } from '../../DoubleColumnRow/DoubleColumnRow'

export const RateDetailsSummaryCard = ({
    submission,
    navigateTo,
}: SubmissionSummaryCardProps): React.ReactElement => {
    return (
        <section id="rateDetails" className={styles.reviewSection}>
            <dl>
                <CardHeader header="Rate details" navigateTo={navigateTo} />
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
        </section>
    )
}
