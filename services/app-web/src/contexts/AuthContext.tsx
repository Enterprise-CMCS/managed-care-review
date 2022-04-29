import * as React from 'react'
import { AuthModeType } from '../common-code/config'
import { useFetchCurrentUserQuery, User as UserType } from '../gen/gqlClient'
import { logoutLocalUser } from '../localAuth'
import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import * as LDClient from 'launchdarkly-js-client-sdk'
import sha256 from 'crypto-js/sha256'

type LogoutFn = () => Promise<null>

export type LoginStatusType = 'LOADING' | 'LOGGED_OUT' | 'LOGGED_IN'

type AuthContextType = {
    loggedInUser: UserType | undefined
    loginStatus: LoginStatusType
    checkAuth: () => Promise<void> // this can probably be simpler, letting callers use the loading states etc instead.
    logout: undefined | (() => Promise<void>)
}

const AuthContext = React.createContext<AuthContextType>({
    loggedInUser: undefined,
    loginStatus: 'LOADING',
    checkAuth: () => Promise.reject(Error('Auth context error')),
    logout: undefined,
})

export type AuthProviderProps = {
    authMode: AuthModeType
    children?: React.ReactNode
}

function AuthProvider({
    authMode,
    children,
}: AuthProviderProps): React.ReactElement {
    const [loggedInUser, setLoggedInUser] = React.useState<
        UserType | undefined
    >(undefined)
    const [loginStatus, setLoginStatus] =
        React.useState<LoginStatusType>('LOGGED_OUT')

    const { loading, data, error, refetch } = useFetchCurrentUserQuery({
        notifyOnNetworkStatusChange: true,
    })

    const isAuthenticated = loggedInUser !== undefined

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
            const { graphQLErrors, networkError } = error

            if (graphQLErrors)
                graphQLErrors.forEach(({ message, locations, path }) =>
                    console.log(
                        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
                    )
                )

            if (networkError) console.log(`[Network error]: ${networkError}`)
            if (isAuthenticated) {
                setLoggedInUser(undefined)
                setLoginStatus('LOGGED_OUT')
            }
        } else if (data?.fetchCurrentUser) {
            if (!isAuthenticated) {
                setLoggedInUser(data.fetchCurrentUser)
                setLoginStatus('LOGGED_IN')
            }
        }
    }

    const checkAuth = () => {
        return new Promise<void>((resolve, reject) => {
            refetch()
                .then(() => {
                    resolve()
                })
                .catch((e) => {
                    console.log('Check Auth Failed.', e)
                    reject(e)
                })
        })
    }

    // add current authenticated user to launchdarkly client
    const client = useLDClient()
    const email = loggedInUser === undefined ? 'anonymous' : loggedInUser.email
    const key = sha256(email).toString()
    const user: LDClient.LDUser = {
        key: key,
        name: loggedInUser?.name,
        email: loggedInUser?.email,
    }
    client?.identify(user).catch((e) => {
        console.log(e)
    })

    const realLogout: LogoutFn =
        authMode === 'LOCAL' ? logoutLocalUser : cognitoSignOut

    const logout =
        loggedInUser === undefined
            ? undefined
            : () => {
                  return new Promise<void>((_resolve, reject) => {
                      realLogout()
                          .then(() => {
                              // Hard navigate back to /
                              // this is more like how things work with IDM anyway.
                              window.location.href = '/'
                          })
                          .catch((e) => {
                              console.log('Logout Failed.', e)
                              reject(e)
                          })
                  })
              }

    return (
        <AuthContext.Provider
            value={{
                loggedInUser,
                loginStatus,
                logout,
                checkAuth,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
