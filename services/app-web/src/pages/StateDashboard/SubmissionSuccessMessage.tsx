import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import { NavLinkWithLogging } from '../../components'
import { ContractSubmissionType } from '../../gen/gqlClient'
import styles from './StateDashboard.module.scss'
import { getSubmissionPath } from '../../routeHelpers'

export function SubmissionSuccessMessage({
    submissionName,
    submissionId,
    contractType,
}: {
    submissionName: string
    submissionId?: string
    contractType?: ContractSubmissionType
}): React.ReactElement {
    const heading = submissionName + ' was sent to CMS'

    const getAlertMessage = () => {
        if (contractType === 'EQRO') {
            return 'You can view your review decision on the submission summary.'
        }
        if (contractType === 'HEALTH_PLAN') {
            return 'To make edits, ask your DMCO lead analyst to unlock your submission.'
        }
        return null
    }

    const alertMessage = getAlertMessage()

    return (
        <div className={styles.alertContainer}>
            <Alert
                type="success"
                headingLevel="h4"
                heading={heading}
                validation={true}
            >
                {alertMessage && contractType && (
                    <>
                        <p className={styles.alertText}>{alertMessage}</p>
                        <NavLinkWithLogging
                            to={getSubmissionPath(
                                'SUBMISSIONS_SUMMARY',
                                contractType,
                                submissionId
                            )}
                        >
                            View submission summary
                        </NavLinkWithLogging>
                    </>
                )}
            </Alert>
        </div>
    )
}
