import React from 'react'
import { Link } from 'react-router-dom'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'
import dayjs from 'dayjs'

export enum SubmissionType {
    ContractOnly = 'CONTRACT_ONLY',
    ContractAndRates = 'CONTRACT_AND_RATES',
}

export enum SubmissionStatus {
    draft = 'DRAFT',
    submitted = 'SUBMITTED',
}

export type SubmissionCardProps = {
    name: string
    description: string
    submissionType: SubmissionType
    status: SubmissionStatus
    date?: dayjs.Dayjs
    href: string
}

export const SubmissionCard = ({
    name,
    description,
    submissionType,
    status,
    date,
    href,
}: SubmissionCardProps): React.ReactElement => {
    const submitted = status === SubmissionStatus.submitted && date

    return (
        <li className={styles.cardContainer}>
            <div className={styles.cardLeft}>
                <Link to={href}>{name}</Link>
                <p>{description}</p>
            </div>
            <div className={styles.cardRight}>
                <span className={styles.submissionType}>
                    {submissionType === 'CONTRACT_ONLY'
                        ? 'Contract only'
                        : 'Contract and rate certification'}
                </span>
                <Tag
                    className={
                        submitted ? styles.tagSuccess : styles.tagWarning
                    }
                >
                    {submitted && date
                        ? `Submitted ${date.format('MM/DD/YYYY')}`
                        : 'Draft'}
                </Tag>
            </div>
        </li>
    )
}
