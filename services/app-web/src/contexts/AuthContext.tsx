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
    storeLoggedInUser: (user: UserType) => void
}
const AuthContext = React.createContext<AuthContextType>({
    localLogin: false,
    loggedInUser: undefined,
    isAuthenticated: false,
    isLoading: false,
    checkAuth: () => Promise.reject(),
    logout: undefined,
    storeLoggedInUser: () => {
        console.log('store logged in user')
    },
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
    const [loggedInUser, setLoggedInUser] = React.useState<
        UserType | undefined
    >(initialize?.user || undefined)
    const [isLoading, setIsLoading] = React.useState(true)

    const { client, loading, error, refetch } = useQuery(HELLO_WORLD, {
        notifyOnNetworkStatusChange: true,
    })

    const storeLoggedInUser = (user: UserType) => {
        console.log('store logged in User', user)
        setLoggedInUser(user)
    }

    if (isLoading != loading) {
        setIsLoading(loading)
    }

    if (error) {
        console.log('Auth request failed', loggedInUser)
        const { graphQLErrors, networkError } = error
        if (graphQLErrors)
            graphQLErrors.forEach(({ message, path }) =>
                console.log(
                    `[GraphQL error]: Message: ${message}, Path: ${path}`
                )
            )

        if (networkError) console.log(`[Network error]: ${networkError}`)

        if (loggedInUser !== undefined) {
            setLoggedInUser(undefined)
        }

        // TODO: do something different if the error is not 403
        // lets try and record what different errors are here.
        // call a generic graphql connection etc. error here.
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
                      realLogout()
                          .then(() => {
                              setLoggedInUser(undefined)
                              client.resetStore()
                              resolve()
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
                storeLoggedInUser,
                checkAuth,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
