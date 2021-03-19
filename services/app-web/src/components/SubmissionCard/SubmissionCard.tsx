import React from 'react'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'

export type SubmissionCardProps = {
    number: string
    description: string
    contractType: 'contractOnly' | 'contractAndRate'
    status: 'draft' | 'submitted'
    date: Date
}

export const SubmissionCard = ({
    number,
    description,
    contractType,
    status,
    date,
}: SubmissionCardProps): React.ReactElement => {
    return (
        <li className={styles.cardContainer}>
            <div className={styles.cardLeft}>
                <a href="/">{number}</a>
                <p>{description}</p>
            </div>
            <div className={styles.cardRight}>
                <p className={styles.submissionType}>{contractType}</p>
                <Tag
                    className={
                        status === 'draft'
                            ? styles.tagWarning
                            : styles.tagSuccess
                    }
                >
                    {status === 'submitted' ? `Submitted ${date}` : 'Draft'}
                </Tag>
            </div>
        </li>
    )
}
