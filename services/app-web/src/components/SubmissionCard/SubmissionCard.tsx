import React from 'react'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'

// TODO: use gqlClient
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
    contractType: SubmissionType
    status: SubmissionStatus
    date?: Date
}

export const SubmissionCard = ({
    name,
    description,
    contractType,
    status,
    date,
}: SubmissionCardProps): React.ReactElement => {
    return (
        <li className={styles.cardContainer}>
            <div className={styles.cardLeft}>
                <a href="/">{name}</a>
                <p>{description}</p>
            </div>
            <div className={styles.cardRight}>
                <span className={styles.submissionType}>{contractType}</span>
                <Tag
                    className={
                        status === SubmissionStatus.draft
                            ? styles.tagWarning
                            : styles.tagSuccess
                    }
                >
                    {SubmissionStatus.submitted && date
                        ? `Submitted ${date}`
                        : 'Draft'}
                </Tag>
            </div>
        </li>
    )
}
