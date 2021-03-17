import React from 'react'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'

export type SubmissionCardProps = {
    number: string,
    description: string,
    type: string
    submitted: boolean,
    date: string
}

export const SubmissionCard = ({number, description, type, submitted, date}: SubmissionCardProps): React.ReactElement => {
    return (
        <ul className={styles.submissionList}>
            <li className={styles.cardContainer}>
                <div className={styles.cardLeft}>
                    <a href="/">{number}</a>
                    <p>{description}</p>
                </div>
                <div className={styles.cardRight}>
                    <p className={styles.submissionType}>{type}</p>
                    <Tag className={submitted ? styles.tagSuccess : styles.tagWarning}>{submitted ? `Submitted ${date}`  : 'Draft'}</Tag>
                </div>
            </li>
        </ul>
    )
}
