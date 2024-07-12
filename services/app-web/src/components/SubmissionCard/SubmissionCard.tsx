//TODO: This file is unused since dashboard refactor
import React from 'react'
import { Tag } from '@trussworks/react-uswds'
import { ReactRouterLinkWithLogging } from '../TealiumLogging/Link'

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
                <ReactRouterLinkWithLogging to={href}>
                    {name}
                </ReactRouterLinkWithLogging>
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
