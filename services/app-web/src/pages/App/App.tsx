import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { GridContainer } from '@trussworks/react-uswds'
import {
    ApolloProvider,
    ApolloClient,
    NormalizedCacheObject,
} from '@apollo/client'

import './App.scss'

import { AppBody } from './AppBody'
import { logEvent } from '../../log_event'
import { AuthProvider } from './AuthContext'

function ErrorFallback({
    error,
}: {
    error: Error
    resetErrorBoundary?: () => void
}): React.ReactElement {
    return (
        <GridContainer>
            <div role="alert">
                <p>Something went wrong:</p>
                <pre>{error.message}</pre>
            </div>
        </GridContainer>
    )
}

function App({
    localLogin,
    apolloClient,
}: {
    localLogin: boolean
    apolloClient: ApolloClient<NormalizedCacheObject>
}): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <BrowserRouter>
                <ApolloProvider client={apolloClient}>
                    <AuthProvider localLogin={localLogin}>
                        <AppBody localLogin={localLogin} />
                    </AuthProvider>
                </ApolloProvider>
            </BrowserRouter>
        </ErrorBoundary>
    )
}

export default App
