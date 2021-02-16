import React from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'

import { Auth } from '../Auth/Auth'
import { useAuth } from './AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { Landing } from '../Landing/Landing'
import { LocalAuth } from '../Auth/LocalAuth'

const localLogin: boolean = process.env.REACT_APP_LOCAL_LOGIN === 'true'

export const AppRoutes = (): React.ReactElement => {
    const { isAuthenticated } = useAuth()

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <>
                {!isAuthenticated ? (
                    <Redirect to="/landing" />
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
