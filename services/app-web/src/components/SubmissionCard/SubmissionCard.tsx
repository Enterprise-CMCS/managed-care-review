import React from 'react'
import { Tag } from '@trussworks/react-uswds'

import styles from './SubmissionCard.module.scss'

export const SubmissionCard = (): React.ReactElement => {
    return (
        <ul className={styles.submissionList}>
            <li className={styles.cardContainer}>
                <div className={styles.cardLeft}>
                    <a href="/">VA-CCCPlus-0001</a>
                    <p>Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.</p>
                </div>
                <div className={styles.cardRight}>
                    <p className={styles.submissionType}>Contract and rate certification</p>
                    <Tag className={styles.tagWarning}>Draft</Tag>
                </div>
            </li>
            <li className={styles.cardContainer}>
                <div className={styles.cardLeft}>
                    <a href="/">VA-CCCPlus-0002</a>
                    <p>Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly. Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.</p>
                </div>
                <div className={styles.cardRight}>
                    <p className={styles.submissionType}>Contract action only</p>
                    <Tag className={styles.tagSuccess}>Submitted [date]</Tag>
                </div>
            </li>
        </ul>
    )
}
