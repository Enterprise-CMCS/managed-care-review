import React from 'react'
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
            Submission status updated to "Submitted"
        </AccessibleAlertBanner>
    )
}
