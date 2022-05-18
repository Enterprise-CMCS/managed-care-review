import * as React from 'react'
import { AuthModeType } from '../common-code/config'
import { useFetchCurrentUserQuery, User as UserType } from '../gen/gqlClient'
import { logoutLocalUser } from '../localAuth'
import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { useRef } from 'react'

import { useLDClient } from 'launchdarkly-react-client-sdk'
import * as ld from 'launchdarkly-js-client-sdk'

type LogoutFn = () => Promise<null>

export type LoginStatusType = 'LOADING' | 'LOGGED_OUT' | 'LOGGED_IN'

type AuthContextType = {
    loggedInUser: UserType | undefined
    loginStatus: LoginStatusType
    checkAuth: () => Promise<void> // this can probably be simpler, letting callers use the loading states etc instead.
    logout: undefined | (() => Promise<void>)
    isSessionExpiring: boolean
    updateSessionExpiry: (value: boolean) => void
    timeUntilLogout: number
}

const AuthContext = React.createContext<AuthContextType>({
    loggedInUser: undefined,
    loginStatus: 'LOADING',
    checkAuth: () => Promise.reject(Error('Auth context error')),
    logout: undefined,
    isSessionExpiring: false,
    updateSessionExpiry: () => void 0,
    timeUntilLogout: 120,
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
    const [isSessionExpiring, setisSessionExpiring] =
        React.useState<boolean>(false)
    const [timeUntilLogout, setTimeUntilLogout] = React.useState<number>(120)
    const runningTimers = useRef<NodeJS.Timer[]>([])
    const { loading, data, error, refetch } = useFetchCurrentUserQuery({
        notifyOnNetworkStatusChange: true,
    })

    React.useEffect(() => {
        if (isSessionExpiring) {
            setTimeUntilLogout(120)
            const timer = setInterval(() => {
                setTimeUntilLogout((timeUntilLogout) => timeUntilLogout - 1)
            }, 1000)
            runningTimers.current.push(timer)
        } else {
            runningTimers.current.forEach((timer) => clearInterval(timer))
            runningTimers.current = []
        }
    }, [isSessionExpiring])

    const isAuthenticated = loggedInUser !== undefined

    // add current authenticated user to launchdarkly client
    const client = useLDClient()
    async function setLDUser(user: UserType) {
        const ldUser: ld.LDUser = {
            key: user.email,
            email: user.email,
            name: user.name,
        }

        const previousUser = client?.getUser() || {}
        await client?.identify(ldUser)
        client?.alias(ldUser, previousUser)
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
                const currentUser = data.fetchCurrentUser
                setLDUser(currentUser).catch((err) => {
                    console.log(err)
                })
                setLoggedInUser(currentUser)
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

    const updateSessionExpiry = (value: boolean) => {
        console.log('called update', value)
        console.log('current', isSessionExpiring)
        if (isSessionExpiring !== value) {
            console.log('setting session expiry to', value)
            setisSessionExpiring(!!loggedInUser && value)
        }
    }

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
                isSessionExpiring,
                updateSessionExpiry,
                timeUntilLogout,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
