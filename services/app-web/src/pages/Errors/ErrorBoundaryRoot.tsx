import { GenericErrorPage } from './GenericErrorPage'
import { recordJSException } from '@mc-review/otel'
import { useEffect } from 'react'
import { EmptyHeader } from '../../components/Header/EmptyHeader'
import styles from '../App/AppBody.module.scss'
/* The error boundary is a fallback UI to catch errors
    See React docs: https://reactjs.org/docs/error-boundaries.html
    It is possible to have different error boundary fallback components at different levels of the hierarchy.
    This component is the root error boundary. If visible, this means that the React frontend has crashed fully and the entire tree is gone.
    Accordingly, this page brings back in an empty header (with no login or stateful data) and the generic error page text.
*/

function ErrorBoundaryRoot({
    error,
}: {
    error: unknown
    resetErrorBoundary?: () => void
}): React.ReactElement {
    useEffect(() => {
        const logError = async () => {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            recordJSException(
                `Crash in ErrorBoundaryRoot. Error message: ${errorMessage}`
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
