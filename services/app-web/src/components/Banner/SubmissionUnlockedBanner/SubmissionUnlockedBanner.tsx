import React from 'react'
import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { formatBannerDate } from '@mc-review/common-code'
import { ExpandableText } from '../../ExpandableText'
import { UpdateInformation, User } from '../../../gen/gqlClient'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { hasCMSUserPermissions } from '@mc-review/helpers'

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
        <Alert
            role="alert"
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
                    &nbsp;ET
                </p>
                <ExpandableText>
                    <>
                        <b>Reason for unlock:&nbsp;</b>
                        {unlockedInfo?.updatedReason ?? 'Not available'}
                    </>
                </ExpandableText>
            </div>
        </Alert>
    )
}
