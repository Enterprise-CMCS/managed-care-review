import React from 'react'
import { Alert } from '@trussworks/react-uswds'

import styles from './StateDashboard.module.scss'
import { useTealium } from '../../hooks'

export function SubmissionSuccessMessage({
    submissionName,
}: {
    submissionName: string
}): React.ReactElement {
    const heading = submissionName + ' was sent to CMS'
    const { logFormSubmitEvent} = useTealium()
    logFormSubmitEvent({
        heading,
        form_field_label: 'stateSubmissonForm'
    })
    return (
        <div className={styles.alertContainer}>
            <Alert
                type="success"
                headingLevel="h4"
                heading={heading}
                validation={true}
            />
        </div>
    )
}
