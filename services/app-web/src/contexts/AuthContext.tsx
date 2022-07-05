import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { AuthModeType } from '../common-code/config'
import { useFetchCurrentUserQuery, User as UserType } from '../gen/gqlClient'
import { logoutLocalUser } from '../localAuth'
import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import * as ld from 'launchdarkly-js-client-sdk'
import { featureFlags } from '../common-code/featureFlags'
import { dayjs } from '../common-code/dateHelpers/dayjs'

type LogoutFn = () => Promise<null>

export type LoginStatusType = 'LOADING' | 'LOGGED_OUT' | 'LOGGED_IN'

type AuthContextType = {
    /* See docs/AuthContext.md for an explanation of some of these variables */
    checkAuth: () => Promise<void> // this can probably be simpler, letting callers use the loading states etc instead.
    checkIfSessionsIsAboutToExpire: () => void
    loggedInUser: UserType | undefined
    loginStatus: LoginStatusType
    logout: undefined | (() => Promise<void>)
    logoutCountdownDuration: number
    sessionExpirationTime: MutableRefObject<dayjs.Dayjs | undefined>
    sessionIsExpiring: boolean
    setLogoutCountdownDuration: (value: number) => void
    updateSessionExpirationState: (value: boolean) => void
    updateSessionExpirationTime: () => void
}

const AuthContext = React.createContext<AuthContextType>({
    checkAuth: () => Promise.reject(Error('Auth context error')),
    checkIfSessionsIsAboutToExpire: () => void 0,
    loggedInUser: undefined,
    loginStatus: 'LOADING',
    logout: undefined,
    logoutCountdownDuration: 120,
    sessionExpirationTime: { current: undefined },
    sessionIsExpiring: false,
    setLogoutCountdownDuration: () => void 0,
    updateSessionExpirationState: () => void 0,
    updateSessionExpirationTime: () => void 0,
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
    const [sessionIsExpiring, setSessionIsExpiring] = useState<boolean>(false)
    const ldClient = useLDClient()
    const minutesUntilExpiration: number = ldClient?.variation(
        featureFlags.MINUTES_UNTIL_SESSION_EXPIRES,
        30
    )
    const sessionExpirationTime = useRef<dayjs.Dayjs>(
        dayjs(Date.now()).add(minutesUntilExpiration, 'minute')
    )
    const countdownDurationSeconds: number =
        ldClient?.variation(featureFlags.MODAL_COUNTDOWN_DURATION, 2) * 60
    const [logoutCountdownDuration, setLogoutCountdownDuration] =
        useState<number>(countdownDurationSeconds)
    const modalCountdownTimers = useRef<NodeJS.Timer[]>([])
    const sessionExpirationTimers = useRef<NodeJS.Timer[]>([])
    const { loading, data, error, refetch } = useFetchCurrentUserQuery({
        notifyOnNetworkStatusChange: true,
    })

    useEffect(() => {
        if (sessionIsExpiring) {
            const timer = setInterval(() => {
                // decrement the countdown timer by one second per second
                modalCountdownTimers.current.push(timer)
                if (logoutCountdownDuration > 0) {
                    setLogoutCountdownDuration(
                        (logoutCountdownDuration) => logoutCountdownDuration - 1
                    )
                }
            }, 1000)
        } else {
            modalCountdownTimers.current.forEach((timer) =>
                clearInterval(timer)
            )
            modalCountdownTimers.current = []
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionIsExpiring, countdownDurationSeconds]) // full dep array causes a loop, because we're resetting the dep in the useEffect

    const isAuthenticated = loggedInUser !== undefined

    // add current authenticated user to launchdarkly client
    const client = useLDClient()
    async function setLDUser(user: UserType) {
        const ldUser: ld.LDUser = {
            key: user.email,
            email: user.email,
            name: user.name,
            custom: {
                role: user.role,
            },
        }

        if (
            user.__typename === 'StateUser' &&
            user.state.code &&
            ldUser.custom
        ) {
            Object.assign(ldUser.custom, { state: user.state.code })
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

    const updateSessionExpirationState = (value: boolean) => {
        if (sessionIsExpiring !== value) {
            setSessionIsExpiring(loggedInUser !== undefined && value)
        }
    }

    const updateSessionExpirationTime = () => {
        sessionExpirationTime.current = dayjs(Date.now()).add(
            minutesUntilExpiration,
            'minute'
        )
    }

    const checkIfSessionsIsAboutToExpire = () => {
        if (!sessionIsExpiring) {
            const timer = setInterval(() => {
                sessionExpirationTimers.current.push(timer)
                let insideCountdownDurationPeriod = false
                if (sessionExpirationTime.current) {
                    insideCountdownDurationPeriod = dayjs(Date.now()).isAfter(
                        dayjs(sessionExpirationTime.current).subtract(
                            countdownDurationSeconds,
                            'second'
                        )
                    )
                }
                if (insideCountdownDurationPeriod) {
                    /* Once we're inside the countdown period, we can stop the interval that checks
                whether we're inside the countdown period */
                    sessionExpirationTimers.current.forEach((t) =>
                        clearInterval(t)
                    )
                    sessionExpirationTimers.current = []
                    updateSessionExpirationState(true)
                }
            }, 1000 * 30)
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
                checkAuth,
                checkIfSessionsIsAboutToExpire,
                loggedInUser,
                loginStatus,
                logout,
                logoutCountdownDuration,
                sessionExpirationTime,
                sessionIsExpiring,
                setLogoutCountdownDuration,
                updateSessionExpirationState,
                updateSessionExpirationTime,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }

//CAVALIERS ROLL
//RAINBOW ROLL
