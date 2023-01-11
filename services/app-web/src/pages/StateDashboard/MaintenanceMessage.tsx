import React from 'react'
import { Alert } from '@trussworks/react-uswds'

import styles from './StateDashboard.module.scss'

export function MaintenanceMessage({
    message,
}: {
    message: string
}): React.ReactElement {
    return (
        <div className={styles.alertContainer}>
            <Alert
                headingLevel="h4"
                type="info"
                heading={message}
                validation={true}
            />
        </div>
    )
}
