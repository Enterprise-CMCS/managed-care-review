import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { Auth } from '../Auth/Auth'
import { Error404 } from '../Errors/Error404'
import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { Landing } from '../Landing/Landing'

export const AppRoutes = (): React.ReactElement => {
    const { loggedInUser } = useAuth()

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/" exact component={Dashboard} />
                <Route path="/" component={Error404} />
            </Switch>
        )
    }

    const UnauthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/auth" exact component={Auth} />
                <Route path="/" component={Landing} />
            </Switch>
        )
    }

    return (
        <>
            {!loggedInUser ? (
                <UnauthenticatedRoutes />
            ) : (
                <AuthenticatedRoutes />
            )}
        </>
    )
}
