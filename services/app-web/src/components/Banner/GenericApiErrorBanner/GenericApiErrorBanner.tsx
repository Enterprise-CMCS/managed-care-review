import React from 'react'
import { ErrorAlertFailedRequest } from '../../ErrorAlert'
import { ErrorAlertValidationError } from '../../ErrorAlert/ErrorAlertValidationError'

export type GenericApiErrorProps = {
    heading?: string
    message?: string
    validationFail?: boolean
}

export const GenericApiErrorBanner = ({
    heading,
    message,
    validationFail = false,
}: GenericApiErrorProps): React.ReactElement => {
    if (validationFail) {
        return <ErrorAlertValidationError heading={heading} message={message} />
    }
    return <ErrorAlertFailedRequest heading={heading} message={message} />
}
