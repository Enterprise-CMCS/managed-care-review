import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { GovBanner } from '@trussworks/react-uswds'

import './App.scss'

import { Auth as AuthPage } from '../Auth/Auth'
import { CheckAuth } from '../Auth/CheckAuth'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { Landing as LandingPage } from '../Landing/Landing'
import { logEvent } from '../../log_event'

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

const DashboardPage = (): React.ReactElement => {
    return <div>Dashboard!</div>
}

function App(): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Router>
                <div className="App">
                    <a className="usa-skipnav" href="#main-content">
                        Skip to main content
                    </a>
                    <GovBanner aria-label="Official government website" />
                    <Header loggedIn={false} />
                    <main id="main-content">
                        <Switch>
                            <Route path="/auth">
                                <AuthPage />
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
            </Router>
        </ErrorBoundary>
    )
}

export default App
