import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { Auth } from '../Auth/Auth'
import { Dashboard } from '../Dashboard/Dashboard'
import { Error404 } from '../Errors/Error404'
import { Landing } from '../Landing/Landing'
import { StateSubmissionForm } from '../StateSubmissionForm/StateSubmissionForm'
import { SubmissionDescriptionExamples } from '../Help/SubmissionDescriptionExamples'
import { useAuth } from '../../contexts/AuthContext'

export const AppRoutes = (): React.ReactElement => {
    const { loggedInUser } = useAuth()

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/" exact component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/new" exact component={StateSubmissionForm} />
                <Route path="/help/submission-description-examples" component={SubmissionDescriptionExamples} />
                <Route path="*" component={Error404} />
            </Switch>
        )
    }

    const UnauthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/" exact component={Landing} />
                <Route path="/auth" component={Auth} />
                <Route path="*" component={Landing} />
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
