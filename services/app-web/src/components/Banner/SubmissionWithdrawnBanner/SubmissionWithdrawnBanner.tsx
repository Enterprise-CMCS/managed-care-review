import React from 'react'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/dates'
import { ExpandableText } from '../../ExpandableText'
import { UpdatedBy } from '../../../gen/gqlClient'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

interface SubmissionWithdrawnBannerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    withdrawInfo: {
        updatedBy: UpdatedBy
        updatedAt: Date
        updatedReason: string
    }
}

export const SubmissionWithdrawnBanner = ({
    className,
    withdrawInfo,
}: SubmissionWithdrawnBannerProps): React.ReactElement => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            heading="Status Updated"
            headingLevel="h4"
            validation={true}
            data-testid="withdrawnSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Status:&nbsp;</b>Withdrawn
                </p>
                <p className="usa-alert__text">
                    <b>Updated by:&nbsp;</b>
                    {getUpdatedByDisplayName(withdrawInfo.updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(withdrawInfo.updatedAt)}
                </p>
                <ExpandableText>
                    <b>Reason for withdrawing the submission:&nbsp;</b>
                    {withdrawInfo.updatedReason}
                </ExpandableText>
            </div>
        </AccessibleAlertBanner>
    )
}
