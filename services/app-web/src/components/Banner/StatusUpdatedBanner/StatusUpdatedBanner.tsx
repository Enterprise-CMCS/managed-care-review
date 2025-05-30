import React from 'react'
import styles from '../Banner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export const StatusUpdatedBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            heading="Status updated"
            headingLevel="h4"
            data-testid="statusUpdatedBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    Submission status updated to "Submitted"
                </p>
            </div>
        </AccessibleAlertBanner>
    )
}
