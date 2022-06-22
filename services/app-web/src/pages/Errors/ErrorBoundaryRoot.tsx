import { GenericErrorPage } from './GenericErrorPage'
import { recordJSException, recordSpan } from '../../otelHelpers/tracingHelper'
import { useEffect } from 'react'

// It is possible to have different error boundary fallback components at different levels of the hierarchy.
// This is the root error boundary. If it is visible, this means that the React frontend has crashed entirely.

function ErrorBoundaryRoot({
    error,
}: {
    error: Error
    resetErrorBoundary?: () => void
}): React.ReactElement {
    useEffect(() => {
        const logError = async () => {
            await recordSpan('React: ErrorBoundary')
            recordJSException(
                `Crash in ErrorBoundaryRoot. Error message: ${error}`
            )
        }
        logError().catch((err) => {
            recordJSException(
                `ErrorBoundaryRoot: failed to log error. Error message: ${err} `
            )
        })
    }, [error])

    return <GenericErrorPage />
}

export { ErrorBoundaryRoot }
