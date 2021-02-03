import React from 'react'
import { Header } from '../../components/Header/Header'
import './App.scss'
import { logEvent } from '../../log_event'
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }: any): React.ReactElement {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
        </div>
    )
}

function App(): React.ReactElement {
    logEvent('on_load', { success: true })
    const mockUser = {
        name: 'Bob test user',
        email: 'bob@dmas.virginia.gov',
    }

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="App">
                <Header user={mockUser} loggedIn stateCode="MN" />
                <main className="padding-x-4">Main Content</main>
            </div>
        </ErrorBoundary>
    )
}

export default App
