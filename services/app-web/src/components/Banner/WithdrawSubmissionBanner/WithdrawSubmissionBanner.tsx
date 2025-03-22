import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'

export const WithdrawSubmissionBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <Alert
            role="alert"
            type="warning"
            heading="Rates on multiple contract actions will not be withdrawn"
            headingLevel="h4"
            data-testid="withdrawSubmissionBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    This contract action has rates on multiple contract actions.
                </p>
            </div>
        </Alert>
    )
}
