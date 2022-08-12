import { GenericErrorPage } from './GenericErrorPage'
import { recordJSException, recordSpan } from '../../otelHelpers/tracingHelper'
import { useEffect } from 'react'
import { EmptyHeader } from '../../components/Header/EmptyHeader'
import styles from '../App/AppBody.module.scss'
// It is possible to have different error boundary fallback components at different levels of the hierarchy.
// This is the root error boundary. If it is visible, this means that the React frontend has crashed entirely and the entire tree is gone.

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

    return (
        <div id="ErrorBoundaryRoot" className={styles.app}>
            <EmptyHeader>
                <div></div>
            </EmptyHeader>
            <main id="main-content" className={styles.mainContent} role="main">
                <GenericErrorPage />
            </main>
        </div>
    )
}

export { ErrorBoundaryRoot }
