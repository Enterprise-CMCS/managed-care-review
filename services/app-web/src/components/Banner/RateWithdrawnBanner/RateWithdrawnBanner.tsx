import { UpdateInformation } from '../../../gen/gqlClient'
import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'
import { dayjs } from '../../../common-code/dateHelpers'
import { ExpandableText } from '../../ExpandableText'

export type RateWithdrawnProps = {
    withdrawInfo: UpdateInformation
}
export const RateWithdrawnBanner = ({
    withdrawInfo,
    className,
}: RateWithdrawnProps &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    const { updatedAt, updatedReason } = withdrawInfo

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
                    Administrator
                </p>
                <p className="usa-alert__text">
                    <b>Withdrawn on:&nbsp;</b>
                    {dayjs
                        .utc(updatedAt)
                        .tz('America/New_York')
                        .format('MM/DD/YY h:mma')}
                    &nbsp;ET
                </p>
                <ExpandableText>
                    <>
                        <b>Reason for withdrawing the rate:&nbsp;</b>
                        {updatedReason}
                    </>
                </ExpandableText>
            </div>
        </Alert>
    )
}
