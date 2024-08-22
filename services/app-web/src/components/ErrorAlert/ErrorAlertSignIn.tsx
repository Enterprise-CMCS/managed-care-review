import React from 'react'
import { ErrorAlert } from './ErrorAlert'

export const ErrorAlertSignIn = (): React.ReactElement => (
    <ErrorAlert
        heading="Sign in error"
        message="There has been a problem signing in."
        remediation='SIGNIN_ERROR'
    />
)
