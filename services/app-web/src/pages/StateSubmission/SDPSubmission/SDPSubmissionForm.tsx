import React from 'react'
import { SDPSubmissionDetails } from './SDPSubmissionDetails'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'

export const SDPSubmissionForm = (): React.ReactElement => {
    return (
        <div
            data-testid="sdp-submission-form-page"
            className={formContainerStyles.formPage}
        >
            <SDPSubmissionDetails />
        </div>
    )
}
