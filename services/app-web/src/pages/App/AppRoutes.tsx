import React from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'

import { Auth } from '../Auth/Auth'
import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { Landing } from '../Landing/Landing'

export const AppRoutes = (): React.ReactElement => {
    const { loggedInUser } = useAuth()

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <>
                <Route path="/" exact component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
            </>
        )
    }

    return (
        <Switch>
            {!loggedInUser ? (
                <>
                    <Route path="/" exact component={Landing} />
                    <Route path="/auth" component={Auth} />
                    <Redirect to="/" />
                </>
            ) : (
                <AuthenticatedRoutes />
            )}
        </Switch>
    )
}
