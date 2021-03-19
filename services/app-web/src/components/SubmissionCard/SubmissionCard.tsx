import React from 'react'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'

export type SubmissionCardProps = {
    name: string
    description: string
    contractType: 'contractOnly' | 'contractAndRate'
    status: 'draft' | 'submitted'
    date: Date
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
