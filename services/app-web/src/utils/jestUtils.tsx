import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { render, Screen, queries } from '@testing-library/react'
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
        routerProvider?: MemoryRouterProps
        apolloProvider?: MockedProviderProps
        authProvider?: Partial<AuthProviderProps>
    }
) => {
    return render(
        <MockedProvider {...apolloProvider}>
            <MemoryRouter {...routerProvider}>
                <AuthProvider localLogin={false} {...authProvider}>
                    {ui}
                </AuthProvider>
            </MemoryRouter>
        </MockedProvider>
    )
}

/* User Events */
const userClickSignIn = (screen: Screen<typeof queries>): void => {
    const signInButton = screen.getByRole('link', { name: /Sign In/i })
    userEvent.click(signInButton)
}
export { renderWithProviders, userClickSignIn }
