import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import { NavLinkWithLogging } from '../../components'

import styles from './StateDashboard.module.scss'

export function SubmissionSuccessMessage({
    submissionName,
    submissionId,
    isEQRO = false,
}: {
    submissionName: string
    submissionId?: string
    isEQRO?: boolean
}): React.ReactElement {
    const heading = submissionName + ' was sent to CMS'

    return (
        <div className={styles.alertContainer}>
            <Alert
                type="success"
                headingLevel="h4"
                heading={heading}
                validation={true}
            >
                {isEQRO && (
                    <>
                        <p className={styles.alertText}>
                            You can view your review decision on the submission
                            summary.
                        </p>
                        <NavLinkWithLogging
                            to={`/submissions/eqro/${submissionId}`}
                        >
                            View submission summary
                        </NavLinkWithLogging>
                    </>
                )}
            </Alert>
        </div>
    )
}
