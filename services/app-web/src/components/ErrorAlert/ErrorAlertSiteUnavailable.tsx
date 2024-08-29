import React from 'react'
import { ErrorAlert } from './ErrorAlert'

export const ErrorAlertSiteUnavailable = (): React.ReactElement => (
    <ErrorAlert
        heading="Site unavailable"
        message="MC-Review is currently unavailable due to technical issues. We are working to resolve these issues as quickly as possible."
        remediation='TECH_ISSUE'
    />
)
