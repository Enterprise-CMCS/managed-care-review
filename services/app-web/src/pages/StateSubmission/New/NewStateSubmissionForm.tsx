import React from 'react'

import { DynamicStepIndicator } from '../../../components/DynamicStepIndicator'
import { STATE_SUBMISSION_FORM_ROUTES } from '../../../constants/routes'
import styles from '../StateSubmissionForm.module.scss'
import { StateSubmissionContainer } from '../StateSubmissionContainer'
import { SubmissionType } from '../SubmissionType/SubmissionType'

export const NewStateSubmissionForm = (): React.ReactElement => {
    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={STATE_SUBMISSION_FORM_ROUTES}
                    currentFormPage={'SUBMISSIONS_TYPE'}
                />
            </div>

            <StateSubmissionContainer>
                <SubmissionType />
            </StateSubmissionContainer>
        </>
    )
}
