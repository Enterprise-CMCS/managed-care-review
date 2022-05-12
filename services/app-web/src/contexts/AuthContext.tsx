import * as React from 'react'
import { AuthModeType } from '../common-code/config'
import { useFetchCurrentUserQuery, User as UserType } from '../gen/gqlClient'
import { logoutLocalUser } from '../localAuth'
import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { useRef } from 'react'

type LogoutFn = () => Promise<null>

export type LoginStatusType = 'LOADING' | 'LOGGED_OUT' | 'LOGGED_IN'

// const LocalStorage = window.localStorage

type AuthContextType = {
    loggedInUser: UserType | undefined
    loginStatus: LoginStatusType
    checkAuth: () => Promise<void> // this can probably be simpler, letting callers use the loading states etc instead.
    logout: undefined | (() => Promise<void>)
    // sessionIsExpiring: React.MutableRefObject<boolean | undefined>
    sessionIsExpiring: boolean
    updateSessionExpiry: (value: boolean) => void
    timeUntilLogout: number
}

const AuthContext = React.createContext<AuthContextType>({
    loggedInUser: undefined,
    loginStatus: 'LOADING',
    checkAuth: () => Promise.reject(Error('Auth context error')),
    logout: undefined,
    // sessionIsExpiring: { current: false },
    sessionIsExpiring: false,
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
    // const sessionIsExpiring = React.useRef<boolean | undefined>(false)
    // const initialExpiringBoolean =
    //     LocalStorage.getItem('IS_EXPIRING')?.toLowerCase() === 'true'
    const [sessionIsExpiring, setSessionIsExpiring] =
        React.useState<boolean>(false)
    const [timeUntilLogout, setTimeUntilLogout] = React.useState<number>(120)
    const runningTimers = React.useRef<NodeJS.Timer[]>([])
    const { loading, data, error, refetch } = useFetchCurrentUserQuery({
        notifyOnNetworkStatusChange: true,
    })

    // React.useEffect(() => {
    //     if (sessionIsExpiring) {
    //         const timer = setInterval(() => {
    //             setTimeUntilLogout((timeUntilLogout) => timeUntilLogout - 1)
    //         }, 1000)
    //         runningTimers.current.push(timer)
    //         // remember to clear this timer
    //     }
    // }, [sessionIsExpiring])

    // const useUpdateSessionExpiry = (): [React.RefCallback<boolean>] => {
    //     const setRef: React.RefCallback<boolean> = React.useCallback(
    //         (value) => {
    //             console.log('setting session expiry to', value)
    //             if (sessionIsExpiring.current !== value && value) {
    //                 sessionIsExpiring.current = value
    //             }
    //         },
    //         []
    //     )

    //     return [setRef]
    // }

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

    const updateSessionExpiry = (value: boolean) => {
        console.log('called update', value)
        console.log('current', sessionIsExpiring)
        if (sessionIsExpiring !== value) {
            console.log('setting session expiry to', value)
            setSessionIsExpiring(value)
            // LocalStorage.setItem('IS_EXPIRING', value.toString())
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
                sessionIsExpiring,
                updateSessionExpiry,
                timeUntilLogout,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
