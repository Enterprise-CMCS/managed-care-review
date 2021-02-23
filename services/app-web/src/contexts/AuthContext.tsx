import * as React from 'react'

import { signOut as cognitoSignOut } from '../pages/Auth/cognitoAuth'
import { logoutLocalUser } from '../pages/Auth/localLogin'
import { UserType } from '../common-code/domain-models'
import { useQuery } from '@apollo/client'

import { HELLO_WORLD } from '../api'

type LogoutFn = () => Promise<null>

type AuthContextType = {
    localLogin: boolean
    loggedInUser: UserType | undefined
    isAuthenticated: boolean
    isLoading: boolean
    checkAuth: () => Promise<void> // this can probably be simpler, letting callers use the loading states etc instead.
    logout: undefined | (() => Promise<void>)
}
const AuthContext = React.createContext<AuthContextType>({
    localLogin: false,
    loggedInUser: undefined,
    isAuthenticated: false,
    isLoading: false,
    checkAuth: () => Promise.reject(),
    logout: undefined,
})

export type AuthProviderProps = {
    initialize?: { user: UserType | undefined }
    localLogin: boolean
    children?: React.ReactNode
}

function AuthProvider({
    localLogin,
    initialize,
    children,
}: AuthProviderProps): React.ReactElement {
    const [loggedInUser, setloggedInUser] = React.useState<
        UserType | undefined
    >(initialize?.user || undefined)
    const [isLoading, setIsLoading] = React.useState(true)

    const { loading, error, data, refetch } = useQuery(HELLO_WORLD, {
        notifyOnNetworkStatusChange: true,
    })

    if (isLoading != loading) {
        setIsLoading(loading)
    }

    if (error) {
        // if the error is 403, then that's all gravy, just set logged in user to undefined
        console.log('Error from logged in check: ', error)
        if (loggedInUser != undefined) {
            setloggedInUser(undefined)
        }
        // TODO: do something different if the error is not 403
        // lets try and record what different errors are here.
        // call a generic graphql connection etc. error here.
    } else if (data) {
        const user: UserType = {
            email: data.hello,
            role: 'STATE_USER',
            state: 'VA',
            name: 'Anyone lived in a pretty How town',
        }

        if (loggedInUser == undefined || loggedInUser.email !== user.email) {
            console.log(loggedInUser, user)
            setloggedInUser(user)
        }
    }

    const checkAuth = () => {
        return new Promise<void>((resolve, reject) => {
            refetch()
                .then(() => {
                    resolve()
                })
                .catch((e) => {
                    console.log('an error checking auth', e)
                    reject(e)
                })
        })
    }

    const isAuthenticated = loggedInUser !== undefined

    const realLogout: LogoutFn = localLogin ? logoutLocalUser : cognitoSignOut

    const logout =
        loggedInUser == undefined
            ? undefined
            : () => {
                  return new Promise<void>((resolve, reject) => {
                      // TODO: can we clear the apollo client cache so we don't have to make a second request in order to logout?
                      realLogout()
                          .then((result) => {
                              console.log('Auth succeeded: ', result)
                              checkAuth()
                          })
                          .catch((e) => {
                              console.log('Auth failed: ', e)
                              reject(e)
                          })
                  })
              }

    return (
        <AuthContext.Provider
            value={{
                localLogin,
                loggedInUser,
                isAuthenticated,
                isLoading,
                logout,
                checkAuth,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
