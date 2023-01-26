import React from 'react'
import { ErrorAlert } from './ErrorAlert'

export const ErrorAlertScheduledMaintenance = (): React.ReactElement => (
    <ErrorAlert
        heading="Site unavailable"
        message="MC-Review is temporarily unavailable due to scheduled 
                        maintenance. Please check back later. If you have questions or 
                        need immediate assistance with your submission, please"
        appendLetUsKnow
    />
)
