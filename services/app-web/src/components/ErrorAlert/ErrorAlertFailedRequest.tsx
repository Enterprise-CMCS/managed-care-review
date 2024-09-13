import React from 'react'

import { ErrorAlert } from './ErrorAlert'
import { RemediationType } from './ErrorRemediations'

export type ErrorAlertFailedRequestProps = {
    message?: string
    heading?: string
    remediation?: RemediationType
}
// These API alerts are away displayed with emphasis and always have a remediation step
// default remediation is to refresh and retry the request
export const ErrorAlertFailedRequest = ({
    heading,
    message,
    remediation = 'DEFAULT',
}: ErrorAlertFailedRequestProps): React.ReactElement => {
    return (
        <ErrorAlert
            heading={heading}
            message={message}
            remediation={remediation}
            withEmphasis
        />
    )
}
