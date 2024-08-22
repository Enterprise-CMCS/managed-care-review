import React from 'react'
import { ErrorAlertFailedRequest } from '../../ErrorAlert'
import { RemediationType } from '../../ErrorAlert/ErrorRemediations'

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
    let remediation :RemediationType | undefined = undefined
    if (validationFail){
        remediation = 'VALIDATION_ERROR'
    }
    return (
        <ErrorAlertFailedRequest heading={heading} message={message} remediation={remediation}/>
    )
}
