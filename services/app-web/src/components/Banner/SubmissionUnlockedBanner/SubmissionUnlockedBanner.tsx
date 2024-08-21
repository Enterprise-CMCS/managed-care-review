import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { dayjs } from '../../../common-code/dateHelpers'
import { ExpandableText } from '../../ExpandableText'

export type UnlockedProps = {
    userType: 'STATE_USER' | 'CMS_USER' | 'CMS_APPROVER_USER'
    unlockedBy: string
    unlockedOn: Date
    reason: string
}

export const SubmissionUnlockedBanner = ({
    userType,
    unlockedBy,
    unlockedOn,
    reason,
    className,
}: UnlockedProps &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type={userType === 'STATE_USER' ? 'info' : 'warning'}
            heading="Submission unlocked"
            headingLevel="h4"
            validation={true}
            data-testid="unlockedBanner"
            className={className}
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
                <ExpandableText>
                    <>
                        <b>Reason for unlock:&nbsp;</b>
                        {reason}
                    </>
                </ExpandableText>
            </div>
        </Alert>
    )
}
