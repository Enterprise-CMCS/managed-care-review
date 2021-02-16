import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { GovBanner, GridContainer } from '@trussworks/react-uswds'
import {
    ApolloProvider,
    ApolloClient,
    NormalizedCacheObject,
} from '@apollo/client'

import './App.scss'

import { AppRoutes } from './AppRoutes'
import { CheckAuth } from '../Auth/CheckAuth'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { logEvent } from '../../log_event'
import { AuthProvider, useAuth } from './AuthContext'

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
    apolloClient,
}: {
    apolloClient: ApolloClient<NormalizedCacheObject>
}): React.ReactElement {
    logEvent('on_load', { success: true })
    const auth = useAuth()
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <BrowserRouter>
                <ApolloProvider client={apolloClient}>
                    <AuthProvider>
                        <div className="App">
                            <a className="usa-skipnav" href="#main-content">
                                Skip to main content
                            </a>
                            <GovBanner aria-label="Official government website" />
                            <Header loggedIn={auth.isAuthenticated} />
                            <main id="main-content">
                                <AppRoutes />
                                <CheckAuth />
                            </main>
                            <Footer />
                        </div>
                    </AuthProvider>
                </ApolloProvider>
            </BrowserRouter>
        </ErrorBoundary>
    )
}

export default App
