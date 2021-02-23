import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { BrowserRouter } from 'react-router-dom'
import { render } from '@testing-library/react'

import { AuthProvider, AuthProviderProps } from '../contexts/AuthContext'
/*
 * A custom render to setup providers.
 * see: https://testing-library.com/docs/react-testing-library/setup#custom-render
 */

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const renderWithProviders = (
    ui: React.ReactNode,
    {
        apolloProvider,
        authProvider,
    }: {
        apolloProvider?: MockedProviderProps
        authProvider: AuthProviderProps
    }
) =>
    render(
        <MockedProvider {...apolloProvider}>
            <BrowserRouter>
                <AuthProvider {...authProvider}>{ui}</AuthProvider>
            </BrowserRouter>
        </MockedProvider>
    )

export { renderWithProviders }
