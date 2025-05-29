import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/dates'
import { ExpandableText } from '../../ExpandableText'
import { UpdatedBy } from '../../../gen/gqlClient'

interface UndoSubmissionWithdrawBannerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    undoWithdrawInfo: {
        updatedBy: UpdatedBy
        updatedAt: Date
        updatedReason: string
    }
}

export const UndoSubmissionWithdrawBanner = ({
    className,
    undoWithdrawInfo,
}: UndoSubmissionWithdrawBannerProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="success"
            heading="Status Updated"
            headingLevel="h4"
            validation={true}
            data-testid="undoWithdrawSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Status:&nbsp;</b>Submitted
                </p>
                <p className="usa-alert__text">
                    <b>Updated by:&nbsp;</b>
                    {getUpdatedByDisplayName(undoWithdrawInfo.updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(undoWithdrawInfo.updatedAt)}
                </p>
                <ExpandableText>
                    <b>
                        Reason for undoing the withdrawal for the
                        submission:&nbsp;
                    </b>
                    {undoWithdrawInfo.updatedReason}
                </ExpandableText>
            </div>
        </Alert>
    )
}
