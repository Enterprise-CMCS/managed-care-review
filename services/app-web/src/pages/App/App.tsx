import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { Header } from '../../components/Header/Header'
import { Auth } from '../Auth/Auth'
import './App.scss'
import { logEvent } from '../../log_event'

const Dashboard = (): React.ReactElement => {
    return <div>Dashboard!</div>
}

function App(): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <Router>
            <div className="App">
                <Header stateCode="TN" />
                <main>
                    <h1>Main Content</h1>
                    <Switch>
                        <Route path="/auth">
                            <Auth />
                        </Route>
                        <Route path="/">
                            <Dashboard />
                        </Route>
                    </Switch>
                </main>
            </div>
        </Router>
    )
}

export default App
