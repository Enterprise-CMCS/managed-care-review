import React from 'react'
import { Switch, Route } from 'react-router-dom'

import { CognitoLogin } from '../Auth/CognitoLogin'
import { LocalLogin } from '../Auth/LocalLogin'
import { Error404 } from '../Errors/Error404'
import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { Landing } from '../Landing/Landing'
import { StateSubmissionForm } from '../StateSubmissionForm/StateSubmissionForm'
import { ContractDetails } from '../StateSubmissionForm/ContractDetails'
import { ReviewSubmit } from '../StateSubmissionForm/ReviewSubmit/ReviewSubmit'
import { SubmissionDescriptionExamples } from '../Help/SubmissionDescriptionExamples'

import { AuthModeType } from '../../common-code/domain-models'

function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x)
}

function componentForAuthMode(
    authMode: AuthModeType
): (() => React.ReactElement) | undefined {
    switch (authMode) {
        case 'LOCAL':
            return LocalLogin
        case 'AWS_COGNITO':
            return CognitoLogin
        case 'IDM':
            return undefined
        default:
            assertNever(authMode)
    }
}

export const AppRoutes = ({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement => {
    const { loggedInUser } = useAuth()

    const authComponent = componentForAuthMode(authMode)

    const AuthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/" exact component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/submissions" component={StateSubmissionForm} />
                <Route
                    path="/help/submission-description-examples"
                    component={SubmissionDescriptionExamples}
                />
                <Route path="*" component={Error404} />
            </Switch>
        )
    }

    const UnauthenticatedRoutes = (): React.ReactElement => {
        return (
            <Switch>
                <Route path="/" exact component={Landing} />
                {/* no /auth page for IDM auth, we just have the login redirect link */}
                {authComponent && (
                    <Route path="/auth" component={authComponent} />
                )}
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
