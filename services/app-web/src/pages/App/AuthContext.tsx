import * as React from 'react'

import { signOut as cognitoSignOut } from '../Auth/cognitoAuth'
import { logoutLocalUser } from '../Auth/localLogin'
import { Result } from '../Auth/result'
import { UserType } from '../../common-code/domain-models'
import { useQuery } from '@apollo/client'

import { HELLO_WORLD } from '../../api'

// type SignUpCredentialsType = {
//     username: string
//     password: string
//     given_name: string
//     family_name: string
// }

// OK, we make a loggedInUser request via GRAPHQL
// If BLAH

type LogoutFn = () => Promise<Result<null, Error>>

type AuthContextType = {
    // isAuthenticated: boolean
    loggedInUser: UserType | undefined
    isLoading: boolean
    checkAuth: () => Promise<void> // this will eventually be removed with the AuthButton
    // login: (
    //     email: string,
    //     password: string
    // ) => Promise<Result<CognitoUser, AmplifyError>>
    logout: undefined | (() => Promise<void>)
}
const AuthContext = React.createContext<AuthContextType>({
    // isAuthenticated: false,
    loggedInUser: undefined,
    isLoading: false,
    checkAuth: () => Promise.reject(),
    // login: signIn,
    logout: undefined,
})

type Props = {
    localLogin: boolean
    children?: React.ReactNode
}

function AuthProvider({ localLogin, children }: Props): React.ReactElement {
    // const [isAuthenticated, setIsAuthenticated] = React.useState(false)
    const [loggedInUser, setloggedInUser] = React.useState<
        UserType | undefined
    >(undefined)
    const [isLoading, setIsLoading] = React.useState(true)

    const { loading, error, data, refetch } = useQuery(HELLO_WORLD, {
        notifyOnNetworkStatusChange: true,
    })
    // HANDLE GQL STATES

    console.log('AUTHING', loading, error, data, refetch)
    if (isLoading != loading) {
        setIsLoading(loading)
    }

    if (error) {
        // if the error is 403, then that's all gravy, just set logged in user to undefined
        console.log('ERROR BACK FROM CHECK: ', error)
        if (loggedInUser != undefined) {
            setloggedInUser(undefined)
        }
    } else if (data) {
        const user: UserType = {
            email: data.hello,
            role: 'STATE_USER',
            state: 'VA',
            name: 'Anyone lived in a pretty How town',
        }

        console.log('Setting USER: ', user)
        if (loggedInUser == undefined || loggedInUser.email !== user.email) {
            console.log(loggedInUser, user)
            setloggedInUser(user)
        }
    }

    // TODO: Remove check auth button and have auth check only when app loads
    // React.useEffect(() => {
    //     console.log('CHECKING AUTH EFFECTS')
    //     checkAuth()
    // }, [])

    const checkAuth = () => {
        return new Promise<void>((resolve, reject) => {
            refetch()
                .then((result) => {
                    console.log('GOOD AUTH', result)
                    resolve()
                })
                .catch((e) => {
                    console.log('an error rechecking auth', e)
                    reject(e)
                })
        })
    }

    // const login = (username: string, password: string) =>
    //     signIn(username, password)
    //         .then((result) => {
    //             setIsAuthenticated(true)
    //             console.log('HELLOOO')
    //             return result
    //         })
    //         .catch((error) => {
    //             console.log('NOT LOGGED IN: ', error)
    //             setIsAuthenticated(false)
    //             return error
    //         })

    const realLogout: LogoutFn = localLogin ? logoutLocalUser : cognitoSignOut

    const logout =
        loggedInUser == undefined
            ? undefined
            : () => {
                  return new Promise<void>((resolve, reject) => {
                      realLogout()
                          .then((result) => {
                              if (result.isOk()) {
                                  console.log('Signed out: ')
                                  checkAuth()
                                      .then(() => {
                                          console.log('agin signed out good')
                                          resolve()
                                      })
                                      .catch((e) => {
                                          console.log(
                                              "But I thought check auth couldn't Reject!",
                                              e
                                          )
                                          reject(e)
                                      })
                              } else {
                                  console.log('signout failed!')
                                  reject()
                              }
                          })
                          .catch((e) => {
                              console.log(
                                  'Errror From The Logout Result Fun. BAD',
                                  e
                              )
                              reject(e)
                          })
                  })
              }

    // const signUp = (credentials: SignUpCredentialsType) => signUp(credentials)
    //     .then(setIsAuthenticated(true))
    //     .catch(error => {
    //         alert(error)
    //         setIsAuthenticated(false)
    //     })

    return (
        <AuthContext.Provider
            value={{
                // isAuthenticated,
                loggedInUser,
                isLoading,
                // login,
                logout,
                checkAuth,
            }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
