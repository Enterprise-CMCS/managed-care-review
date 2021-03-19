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

//TODO: create date/time utilities
/**
 * Format a date to format YYYY-MM-DD
 *
 * @param {string} unixTimestamp the timestamp to format
 * @returns {string} the formatted date string
 */
export const formatDateFromUnixTimestamp = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp)
    const padZeros = (value: number, length: number): string => {
        return `0000${value}`.slice(-length)
    }

    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = date.getFullYear()

    return [padZeros(month, 2), padZeros(day, 2), padZeros(year, 4)].join('/')
}

export type SubmissionCardProps = {
    name: string
    description: string
    submissionType: SubmissionType
    status: SubmissionStatus
    date?: number
}

export const SubmissionCard = ({
    name,
    description,
    submissionType,
    status,
    date,
}: SubmissionCardProps): React.ReactElement => {
    const submitted = status === SubmissionStatus.submitted && date

    return (
        <li className={styles.cardContainer}>
            <div className={styles.cardLeft}>
                <a href="/">{name}</a>
                <p>{description}</p>
            </div>
            <div className={styles.cardRight}>
                <span className={styles.submissionType}>
                    {submissionType === SubmissionType.ContractOnly
                        ? 'Contract only'
                        : 'Contract and rate certification'}
                </span>
                <Tag
                    className={
                        submitted ? styles.tagSuccess : styles.tagWarning
                    }
                >
                    {submitted
                        ? `Submitted ${formatDateFromUnixTimestamp(
                              date as number
                          )}`
                        : 'Draft'}
                </Tag>
            </div>
        </li>
    )
}
