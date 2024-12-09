import { Alert } from '@trussworks/react-uswds'
import React from 'react'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/common-code'
import { UpdatedBy } from '../../../gen/gqlClient'
import { ExpandableText } from '../../ExpandableText'

export type ApprovalProps = {
    updatedBy: UpdatedBy
    updatedAt: Date
    note?: string
}

export const SubmissionApprovedBanner = ({
    className,
    updatedAt,
    updatedBy,
    note,
}: ApprovalProps & React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <Alert
            role="alert"
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
                {note && (
                    <ExpandableText>
                        <b>Optional note:&nbsp;</b>
                        {note}
                    </ExpandableText>
                )}
            </div>
        </Alert>
    )
}
