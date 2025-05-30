import React from 'react'
import styles from '../Banner.module.scss'
import { formatBannerDate } from '@mc-review/dates'
import { ExpandableText } from '../../ExpandableText'
import { UpdateInformation, User } from '../../../gen/gqlClient'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export type UnlockedProps = {
    loggedInUser?: User
    unlockedInfo?: UpdateInformation | null
}

export const SubmissionUnlockedBanner = ({
    className,
    loggedInUser,
    unlockedInfo,
}: UnlockedProps &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    return (
        <AccessibleAlertBanner
            role="status"
            type={hasCMSUserPermissions(loggedInUser) ? 'warning' : 'info'}
            heading="Submission unlocked"
            headingLevel="h4"
            validation={true}
            data-testid="unlockedBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Unlocked by:&nbsp;</b>
                    {getUpdatedByDisplayName(unlockedInfo?.updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Unlocked on:&nbsp;</b>
                    {formatBannerDate(unlockedInfo?.updatedAt)}
                </p>
                <ExpandableText>
                    <>
                        <b>Reason for unlock:&nbsp;</b>
                        {unlockedInfo?.updatedReason ?? 'Not available'}
                    </>
                </ExpandableText>
            </div>
        </AccessibleAlertBanner>
    )
}
