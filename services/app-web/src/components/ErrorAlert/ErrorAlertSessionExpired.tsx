import React from 'react'
import { ErrorAlert } from './ErrorAlert'

export const ErrorAlertSessionExpired = (): React.ReactElement => (
    <ErrorAlert
        heading="Session expired"
        message="You have been logged out due to inactivity. Please sign in again."
    />
)
