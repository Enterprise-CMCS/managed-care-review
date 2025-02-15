import { UpdateInformation } from '../../../gen/gqlClient'
import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'
import { ExpandableText } from '../../ExpandableText'
import { formatBannerDate } from '@mc-review/dates'
import { getUpdatedByDisplayName } from '@mc-review/helpers'

export type RateReplacedProps = {
    withdrawInfo: UpdateInformation
}
export const RateReplacedBanner = ({
    withdrawInfo,
    className,
}: RateReplacedProps &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    const { updatedAt, updatedReason, updatedBy } = withdrawInfo

    return (
        <Alert
            role="alert"
            type="info"
            heading="Withdrawn Rate"
            headingLevel="h4"
            validation={true}
            data-testid="rateWithdrawnBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>Withdrawn by:&nbsp;</b>
                    {getUpdatedByDisplayName(updatedBy)}
                </p>
                <p className="usa-alert__text">
                    <b>Withdrawn on:&nbsp;</b>
                    {formatBannerDate(updatedAt)}
                </p>
                <ExpandableText>
                    <>
                        <b>Reason for withdrawing the rate:&nbsp;</b>
                        {updatedReason ?? 'Not available'}
                    </>
                </ExpandableText>
            </div>
        </Alert>
    )
}
