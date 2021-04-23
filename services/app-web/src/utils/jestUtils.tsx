import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Router, RouterProps } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { render, Screen, queries, ByRoleMatcher } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AuthProvider, AuthProviderProps } from '../contexts/AuthContext'

import { PageProvider } from '../contexts/PageContext'
import { S3Provider } from '../contexts/S3Context'
import { testS3Client } from './s3Helpers'

/* Render */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const renderWithProviders = (
    ui: React.ReactNode,
    options?: {
        routerProvider?: { route?: string; routerProps?: RouterProps }
        apolloProvider?: MockedProviderProps
        authProvider?: Partial<AuthProviderProps>
    }
) => {
    const { routerProvider = {}, apolloProvider = {}, authProvider = {} } =
        options || {}

    const { route, routerProps } = routerProvider
    const testHistory = routerProps?.history
        ? routerProps.history
        : createMemoryHistory()

    if (route) {
        testHistory.push(route)
    }
    return render(
        <MockedProvider {...apolloProvider}>
            <Router history={testHistory}>
                <AuthProvider authMode={'AWS_COGNITO'} {...authProvider}>
                    <S3Provider client={testS3Client}>
                        <PageProvider>{ui}</PageProvider>
                    </S3Provider>
                </AuthProvider>
            </Router>
        </MockedProvider>
    )
}

/* User Events */

const userClickByTestId = (
    screen: Screen<typeof queries>,
    testId: string
): void => {
    const element = screen.getByTestId(testId)
    userEvent.click(element)
}
const userClickByRole = (
    screen: Screen<typeof queries>,
    role: ByRoleMatcher,
    options?: queries.ByRoleOptions | undefined
): void => {
    const element = screen.getByRole(role, options)
    userEvent.click(element)
}

const userClickSignIn = (screen: Screen<typeof queries>): void => {
    const signInButton = screen.getByRole('link', { name: /Sign In/i })
    userEvent.click(signInButton)
}

export {
    renderWithProviders,
    userClickByRole,
    userClickByTestId,
    userClickSignIn,
}
