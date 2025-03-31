import { Alert } from '@trussworks/react-uswds'
import React from 'react'
import styles from '../Banner.module.scss'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/dates'
import { UpdatedBy } from '../../../gen/gqlClient'
import { ExpandableText } from '../../ExpandableText'

export type WithdrawProps = {
    updatedBy: UpdatedBy | undefined
    updatedAt: Date
    reasonForWithdraw: string | undefined
}

export const RateWithdrawBanner = ({
    className,
    updatedAt,
    updatedBy,
    reasonForWithdraw,
}: WithdrawProps & React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <Alert
            role="alert"
            type="success"
            heading="Status updated"
            headingLevel="h4"
            validation={true}
            data-testid="rateWithdrawBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Status:&nbsp;</b>Withdrawn
                </p>
                <p className="usa-alert__text">
                    <b>Updated by:&nbsp;</b>
                    {getUpdatedByDisplayName(updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Updated on:&nbsp;</b>
                    {formatBannerDate(updatedAt)}
                </p>
                <ExpandableText>
                    <b>Reason for withdrawing the rate:&nbsp;</b>
                    {reasonForWithdraw}
                </ExpandableText>
            </div>
        </Alert>
    )
}
