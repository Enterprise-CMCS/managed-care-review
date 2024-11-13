import React from 'react'
import { ErrorAlertFailedRequest } from './ErrorAlertFailedRequest'

export type ErrorAlertFailedRequestProps = {
    message?: string
    heading?: string
}

export const ErrorAlertValidationError = ({
    heading = 'Missing required fields',
    message = "We're having trouble completing this request.",
}: ErrorAlertFailedRequestProps): React.ReactElement => {
    return (
        <ErrorAlertFailedRequest
            heading={heading}
            message={message}
            remediation="VALIDATION_ERROR"
        />
    )
}
