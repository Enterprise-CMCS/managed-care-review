import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { render, Screen, queries, ByRoleMatcher } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AuthProvider, AuthProviderProps } from '../contexts/AuthContext'

/* Render */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const renderWithProviders = (
    ui: React.ReactNode,
    {
        routerProvider,
        apolloProvider,
        authProvider,
    }: {
        routerProvider?: { route: string }
        apolloProvider?: MockedProviderProps
        authProvider?: Partial<AuthProviderProps>
    }
) => {
    const { route } = routerProvider ?? {}
    const testHistory = createMemoryHistory()

    if (route) {
        testHistory.push(route)
    }
    return render(
        <MockedProvider {...apolloProvider}>
            <Router history={testHistory}>
                <AuthProvider localLogin={false} {...authProvider}>
                    {ui}
                </AuthProvider>
            </Router>
        </MockedProvider>
    )
}

/* User Events */

const userClickByTestId = (
    screen: Screen<typeof queries>,
    text: string
): void => {
    const element = screen.getByTestId(text)
    userEvent.click(element)
}
const userClickByRole = (
    screen: Screen<typeof queries>,
    text: ByRoleMatcher,
    options?: queries.ByRoleOptions | undefined
): void => {
    const element = screen.getByRole(text, options)
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
