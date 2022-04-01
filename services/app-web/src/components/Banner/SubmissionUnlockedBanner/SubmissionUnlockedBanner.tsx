import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { dayjs } from '../../../dateHelpers'

export type UnlockedProps = {
    userType: 'STATE_USER' | 'CMS_USER'
    unlockedBy: string
    unlockedOn: Date
    reason: string
}

export const SubmissionUnlockedBanner = ({
    userType,
    unlockedBy,
    unlockedOn,
    reason,
}: UnlockedProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type={userType === 'CMS_USER' ? 'warning' : 'info'}
            heading="Submission unlocked"
            validation={true}
            data-testid="unlockedBanner"
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Unlocked by:&nbsp;</b>
                    {unlockedBy}
                </p>
                <p className="usa-alert__text">
                    <b>Unlocked on:&nbsp;</b>
                    {dayjs
                        .utc(unlockedOn)
                        .tz('America/New_York')
                        .format('MM/DD/YY h:mma')}
                    &nbsp;ET
                </p>
                <p className="usa-alert__text">
                    <b>Reason for unlock:&nbsp;</b>
                    {reason}
                </p>
            </div>
        </Alert>
    )
}
