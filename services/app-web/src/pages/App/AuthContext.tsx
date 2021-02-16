import * as React from 'react'
import { signIn, signOut, AmplifyError } from '../Auth/cognitoAuth'
import { isAuthenticated as checkIsAuthenticated } from '../Auth/isAuthenticated'
import { CognitoUser } from 'amazon-cognito-identity-js'
import { Result } from '../Auth/result'

// type SignUpCredentialsType = {
//     username: string
//     password: string
//     given_name: string
//     family_name: string
// }

type AuthContextType = {
    isAuthenticated: boolean
    isLoading: boolean
    checkAuth: () => Promise<boolean> // this will eventually be removed with the AuthButton
    login: (
        email: string,
        password: string
    ) => Promise<Result<CognitoUser, AmplifyError>>
    logout: () => Promise<Result<CognitoUser, AmplifyError>>
}
const AuthContext = React.createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: false,
    checkAuth: checkIsAuthenticated,
    login: signIn,
    logout: signOut,
})

const AuthProvider: React.FC = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)

    // TODO: Remove check auth button and have auth check only when app loads
    React.useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = () =>
        checkIsAuthenticated()
            .then(() => setIsLoading(false))
            .then(() => {
                setIsAuthenticated(true)
                return true
            })
            .catch(() => {
                setIsAuthenticated(false)
                return false
            })

    const login = (username: string, password: string) =>
        signIn(username, password)
            .then((result) => {
                setIsAuthenticated(true)
                console.log('HELLOOO')
                return result
            })
            .catch((error) => {
                setIsAuthenticated(false)
                return error
            })

    const logout = () =>
        signOut()
            .then((result) => {
                setIsAuthenticated(false)
                return result
            })
            .catch((error) => {
                return error
            })

    // const signUp = (credentials: SignUpCredentialsType) => signUp(credentials)
    //     .then(setIsAuthenticated(true))
    //     .catch(error => {
    //         alert(error)
    //         setIsAuthenticated(false)
    //     })

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, isLoading, login, logout, checkAuth }}
            children={children}
        />
    )
}

const useAuth = (): AuthContextType => React.useContext(AuthContext)

export { AuthProvider, useAuth }
