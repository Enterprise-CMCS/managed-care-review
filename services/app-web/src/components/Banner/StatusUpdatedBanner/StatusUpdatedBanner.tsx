import React from 'react'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export const StatusUpdatedBanner = ({
    className,
    message = 'Submission status updated to "Submitted".',
}: {
    message?: string
} & React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="success"
            heading="Status updated"
            headingLevel="h4"
            data-testid="statusUpdatedBanner"
            className={className}
        >
            {message}
        </AccessibleAlertBanner>
    )
}
