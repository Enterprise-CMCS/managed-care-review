import React from 'react'
import styles from '../Banner.module.scss'
import { RatesToNotBeWithdrawn } from '../../../pages/SubmissionWithdraw/SubmissionWithdraw'
import { NavLinkWithLogging } from '../../TealiumLogging'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

interface SubmissionWithdrawWarningBannerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    rates: RatesToNotBeWithdrawn[]
}

export const SubmissionWithdrawWarningBanner = ({
    className,
    rates,
}: SubmissionWithdrawWarningBannerProps) => {
    return (
        <AccessibleAlertBanner
            role="alert"
            type="warning"
            heading="Rate on multiple contract actions"
            headingLevel="h4"
            data-testid="withdrawSubmissionBanner"
            className={className}
        >
            <span className={styles.bannerBodyText}>
                <span>
                    Withdrawing this submission will not withdraw the following
                    rate(s) that are on multiple contract actions:
                </span>
                <ul>
                    {rates.map((rate: RatesToNotBeWithdrawn) => (
                        <li>
                            <NavLinkWithLogging to={rate.rateURL}>
                                {rate.rateName}
                            </NavLinkWithLogging>
                        </li>
                    ))}
                </ul>
            </span>
        </AccessibleAlertBanner>
    )
}
