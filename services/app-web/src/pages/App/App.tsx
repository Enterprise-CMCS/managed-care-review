import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { GovBanner } from '@trussworks/react-uswds'
import {
    ApolloProvider,
    ApolloClient,
    NormalizedCacheObject,
} from '@apollo/client'

import './App.scss'

import { Auth as AuthPage } from '../Auth/Auth'
import { CheckAuth } from '../Auth/CheckAuth'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { Landing as LandingPage } from '../Landing/Landing'
import { LocalAuth } from '../Auth/LocalAuth'
import { logEvent } from '../../log_event'
import { Dashboard as DashboardPage } from '../Dashboard/Dashboard'

function ErrorFallback({
    error,
}: {
    error: Error
    resetErrorBoundary?: () => void
}): React.ReactElement {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
        </div>
    )
}

type Props = {
    localLogin: boolean
    apolloClient: ApolloClient<NormalizedCacheObject>
}

function App({ localLogin, apolloClient }: Props): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Router>
                <ApolloProvider client={apolloClient}>
                    <div className="App">
                        <a className="usa-skipnav" href="#main-content">
                            Skip to main content
                        </a>
                        <GovBanner aria-label="Official government website" />
                        <Header loggedIn={false} />
                        <main id="main-content">
                            <Switch>
                                <Route path="/auth">
                                    {localLogin ? <LocalAuth /> : <AuthPage />}
                                </Route>
                                <Route path="/dashboard">
                                    <DashboardPage />
                                </Route>
                                <Route path="/">
                                    <LandingPage />
                                </Route>
                            </Switch>
                            <CheckAuth />
                        </main>
                        <Footer />
                    </div>
                </ApolloProvider>
            </Router>
        </ErrorBoundary>
    )
}

export default App
