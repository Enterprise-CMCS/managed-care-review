import { GenericErrorPage } from './GenericErrorPage'
    import { startAndReportSpan } from '../../otelHelpers/tracingHelper'

// It is possible to have different error boundary fallback components at different levels of the hierarchy. 
// This is the root error boundary. If it is visible, this means that the React frontend has crashed entirely.

function ErrorBoundaryRoot({
    error,
}: {
    error: Error
    resetErrorBoundary?: () => void
}): React.ReactElement {

    startAndReportSpan('ErrorBoundaryRoot')
    console.error(error)
    return <GenericErrorPage />
}

export {ErrorBoundaryRoot}
