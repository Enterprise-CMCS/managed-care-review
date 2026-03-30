import React from 'react'
import {
    SDPSubmissionDetails,
    sdpSubmissionDetailsInitialValues,
    type SDPSubmissionDetailsFormValues,
} from './SDPSubmissionDetails'
import { SDPDetails } from './SDPDetails'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'

export const SDPSubmissionForm = (): React.ReactElement => {
    const [currentPage, setCurrentPage] = React.useState<
        'SUBMISSIONS_TYPE' | 'SUBMISSIONS_CONTRACT_DETAILS'
    >('SUBMISSIONS_TYPE')
    const [submissionDetailsValues, setSubmissionDetailsValues] =
        React.useState<SDPSubmissionDetailsFormValues>(
            sdpSubmissionDetailsInitialValues
        )

    return (
        <div
            data-testid="sdp-submission-form-page"
            className={formContainerStyles.formPage}
        >
            {currentPage === 'SUBMISSIONS_TYPE' ? (
                <SDPSubmissionDetails
                    initialValues={submissionDetailsValues}
                    onContinue={(values) => {
                        setSubmissionDetailsValues(values)
                        setCurrentPage('SUBMISSIONS_CONTRACT_DETAILS')
                    }}
                />
            ) : (
                <SDPDetails onBack={() => setCurrentPage('SUBMISSIONS_TYPE')} />
            )}
        </div>
    )
}
