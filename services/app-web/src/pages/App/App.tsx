import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { Header } from '../../components/Header/Header'
import { Auth } from '../Auth/Auth'
import { CheckAuth } from '../Auth/CheckAuth'
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

const Dashboard = (): React.ReactElement => {
    return <div>Dashboard!</div>
}

const Landing = (): React.ReactElement => {
    return <div>Landing Page</div>
}

function App(): React.ReactElement {
    logEvent('on_load', { success: true })
    const mockUser = {
        name: 'Bob test user',
        email: 'bob@dmas.virginia.gov',
    }

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Router>
                <div className="App">
                    <Header user={mockUser} loggedIn stateCode="MN" />
                    <main className="padding-x-4">
                        <h1>Main Content</h1>
                        <Switch>
                            <Route path="/auth">
                                <Auth />
                            </Route>
                            <Route path="/dashboard">
                                <Dashboard />
                            </Route>
                            <Route path="/">
                                <Landing />
                            </Route>
                        </Switch>
                        <CheckAuth />
                    </main>
                </div>
            </Router>
        </ErrorBoundary>
    )
}

export default App
