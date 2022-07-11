import React from 'react'
import { Alert } from '@trussworks/react-uswds'

import styles from './Dashboard.module.scss'

export function SubmissionSuccessMessage({
    submissionName,
}: {
    submissionName: string
}): React.ReactElement {
    return (
        <div className={styles.alertContainer}>
            <Alert
                type="success"
                heading={submissionName + ' was sent to CMS'}
                validation={true}
            />
        </div>
    )
}
