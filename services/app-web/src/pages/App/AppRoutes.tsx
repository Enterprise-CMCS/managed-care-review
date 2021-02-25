import React from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'

import { Auth } from '../Auth/Auth'
import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { Landing } from '../Landing/Landing'
import { LocalAuth } from '../Auth/LocalAuth'
import { GenericError } from '../Errors/GenericError'
import { Error404 } from '../Errors/Error404'

export const AppRoutes = (): React.ReactElement => {
    const { loggedInUser, localLogin } = useAuth()

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <>
                {!loggedInUser ? (
                    <Redirect to="/" />
                ) : (
                    <Route path="/dashboard" component={Dashboard} />
                    // Add other authenticated routes here
                )}
            </>
        )
    }

    return (
        <Switch>
            <Route path="/" exact component={Landing} />
            <Route path="/auth" component={localLogin ? LocalAuth : Auth} />
            <AuthenticatedRoutes />
        </Switch>
    )
}
