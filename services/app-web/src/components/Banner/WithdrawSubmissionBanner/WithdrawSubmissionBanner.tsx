import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'
import { RatesToNotBeWithdrawn } from '../../../pages/SubmissionWithdraw/SubmissionWithdraw'
import { NavLinkWithLogging } from '../../TealiumLogging'

interface WithdrawSubmissionBannerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    rates: RatesToNotBeWithdrawn[]
}

export const WithdrawSubmissionBanner = ({
    className,
    rates,
}: WithdrawSubmissionBannerProps) => {
    return (
        <Alert
            role="alert"
            type="warning"
            heading="Rate on multiple contract actions"
            headingLevel="h4"
            data-testid="withdrawSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    Withdrawing this submission will not withdraw the following
                    rate(s) that are on multiple contract actions:
                </p>
                <ul>
                    {rates.map((rate: RatesToNotBeWithdrawn) => (
                        <li>
                            <NavLinkWithLogging to={rate.rateURL}>
                                {rate.rateName}
                            </NavLinkWithLogging>
                        </li>
                    ))}
                </ul>
            </div>
        </Alert>
    )
}
