import React, { useState } from 'react'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import * as ld from 'launchdarkly-js-client-sdk'
import { AuthModeType } from '../common-code/config'
import {extendSession} from '../pages/Auth/cognitoAuth'
import {
    FetchCurrentUserQuery,
    useFetchCurrentUserQuery,
    User as UserType,
} from '../gen/gqlClient'
import { logoutLocalUser } from '../localAuth'
import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { recordJSException } from '../otelHelpers/tracingHelper'
import { handleApolloError } from '../gqlHelpers/apolloErrors'
import { ApolloQueryResult } from '@apollo/client'

export type LoginStatusType = 'LOADING' | 'LOGGED_OUT' | 'LOGGED_IN'

type AuthContextType = {
    checkAuth: (
        failureRedirect?: string
    ) => Promise<ApolloQueryResult<FetchCurrentUserQuery> | Error>
    refreshAuth: () => Promise<void>
    loggedInUser: UserType | undefined
    loginStatus: LoginStatusType
    logout: ({
        sessionTimeout,
        redirectPath,
    }: {
        sessionTimeout: boolean
        redirectPath?: string
    }) => Promise<void>
}

const AuthContext = React.createContext<AuthContextType>({
    checkAuth: () => Promise.reject(Error('Auth context error')),
    loggedInUser: undefined,
    loginStatus: 'LOADING',
    refreshAuth: () => Promise.resolve(undefined),
    logout: () => Promise.resolve(undefined),
})

export type AuthProviderProps = {
    authMode: AuthModeType
    children?: React.ReactNode
}

function AuthProvider({
    authMode,
    children,
}: AuthProviderProps): React.ReactElement {
    const [loggedInUser, setLoggedInUser] = useState<UserType | undefined>(
        undefined
    )
    const [loginStatus, setLoginStatus] =
        useState<LoginStatusType>('LOGGED_OUT')

    const { loading, data, error, refetch } = useFetchCurrentUserQuery({
        notifyOnNetworkStatusChange: true,
    })

    const isAuthenticated = loggedInUser !== undefined

    // add current authenticated user to launchdarkly client
    const client = useLDClient()
    async function setLDUser(user: UserType): Promise<Error | undefined> {
        const ldContext: ld.LDSingleKindContext = {
            kind: 'user',
            key: user.email,
            email: user.email,
            role: user.role,
            state: '',
        }
        if (user.__typename === 'StateUser' && user.state.code) {
            ldContext.state = user.state.code
        }

        try {
            await client?.identify(ldContext)
        } catch (err) {
            return new Error(`Could not identify user ${err}`)
        }
    }

    const computedLoginStatus: LoginStatusType = loading
        ? 'LOADING'
        : loggedInUser !== undefined
          ? 'LOGGED_IN'
          : 'LOGGED_OUT'

    if (loginStatus !== computedLoginStatus) {
        setLoginStatus(computedLoginStatus)
    }

    if (!loading) {
        if (error) {
            handleApolloError(error, isAuthenticated)
            if (isAuthenticated) {
                setLoggedInUser(undefined)
                setLoginStatus('LOGGED_OUT')
                recordJSException(
                    `[User auth error]: Unable to authenticate user though user seems to be logged in. Message: ${error.message}`
                )
                // since we have an auth request error but a potentially logged in user, we log out fully from Auth context and redirect to dashboard for clearer user experience
                window.location.href = `/?signin-error=true`
            }
        } else if (data?.fetchCurrentUser) {
            if (!isAuthenticated) {
                const currentUser = data.fetchCurrentUser
                setLDUser(currentUser).catch((err) => {
                    recordJSException(
                        new Error(`Cannot set LD User. ${JSON.stringify(err)}`)
                    )
                })
                setLoggedInUser(currentUser)
                setLoginStatus('LOGGED_IN')
            }
        }
    }
        /*
        Close user session and handle redirect afterward

        @param {sessionTimeout} will pass along a URL query param to display session expired alert
        @param {redirectPath} optionally changes redirect path on logout - useful for cognito and local login\

        Logout is called when user clicks to logout from header or session expiration modal
        Also called in the background with session times out
    */
        const logout: AuthContextType['logout'] = async ({
            sessionTimeout,
            redirectPath = '/',
        }) => {
            const realLogout =
                authMode === 'LOCAL' ? logoutLocalUser : cognitoSignOut

            try {
                await realLogout()
                if (sessionTimeout) {
                    window.location.href = `${redirectPath}?session-timeout=true`
                } else {
                    window.location.href = redirectPath
                }
                return
            } catch (e) {
                recordJSException(new Error(`Logout Failed. ${JSON.stringify(e)}`))
                window.location.href = redirectPath
                return
            }
        }


    /*
        Refetches current user and confirms authentication - primarily used with LocalLogin and CognitoLogin - not on IDM
        @param {failureRedirectPath} passed through to logout which is called on certain checkAuth failures

        Use this function to reconfirm the user is logged in. Also used in CognitoLogin
    */
    const checkAuth: AuthContextType['checkAuth'] = async (
        failureRedirectPath = '/?session-timeout'
    ) => {
        try {
            return await refetch()
        } catch (e) {
            // if we fail auth at a time we expected logged in user, the session may have timed out. Logout fully to reflect that and force React state update
            if (loggedInUser) {
                await logout({
                    sessionTimeout: true,
                    redirectPath: failureRedirectPath,
                })
            }
            return new Error(e)
        }
    }

    const refreshAuth = async () => {
        if (authMode !== 'LOCAL') {
            await extendSession()
        }
            return
    }

    return (
        <AuthContext.Provider
            value={{
                loggedInUser,
                loginStatus,
                checkAuth,
                refreshAuth,
                logout,

            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
