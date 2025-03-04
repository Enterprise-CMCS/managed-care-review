import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'

export const StatusUpdatedBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <Alert
            role="alert"
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
        </Alert>
    )
}
