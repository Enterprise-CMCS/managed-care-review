import React from 'react'
import styles from './StateDashboard.module.scss'
import { AccessibleAlertBanner } from '../../components/Banner/AccessibleAlertBanner/AccessibleAlertBanner'

export function MaintenanceMessage({
    message,
}: {
    message: string
}): React.ReactElement {
    return (
        <div className={styles.alertContainer}>
            <AccessibleAlertBanner
                role="status"
                headingLevel="h4"
                type="info"
                heading={message}
                validation={true}
            />
        </div>
    )
}
