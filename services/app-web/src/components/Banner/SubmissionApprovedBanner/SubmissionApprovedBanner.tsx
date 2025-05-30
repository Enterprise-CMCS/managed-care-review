import React from 'react'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate, formatCalendarDate } from '@mc-review/dates'
import { UpdatedBy } from '../../../gen/gqlClient'
import { ExpandableText } from '../../ExpandableText'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export type ApprovalProps = {
    updatedBy: UpdatedBy
    updatedAt: Date
    dateReleasedToState: string
}

export const SubmissionApprovedBanner = ({
    className,
    updatedAt,
    updatedBy,
    dateReleasedToState,
}: ApprovalProps & React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            heading="Status updated"
            headingLevel="h4"
            validation={true}
            data-testid="submissionApprovedBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Status:&nbsp;</b> Approved
                </p>
                <p className="usa-alert__text">
                    <b>Updated by:&nbsp;</b>
                    {getUpdatedByDisplayName(updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(updatedAt)}
                </p>
                {dateReleasedToState && (
                    <ExpandableText>
                        <b>Date released to state:&nbsp;</b>
                        {formatCalendarDate(dateReleasedToState, 'UTC')}
                    </ExpandableText>
                )}
            </div>
        </AccessibleAlertBanner>
    )
}
