import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Story } from '@storybook/react'

import { AuthProvider, AuthProviderProps } from '../src/contexts/AuthContext'
import { PageProvider } from '../src/contexts/PageContext'

const ProvidersDecorator = (
    Story: Story,
    {
        apolloProvider,
        authProvider,
    }: {
        apolloProvider?: MockedProviderProps
        authProvider?: AuthProviderProps
    }
) => (
    <MockedProvider {...apolloProvider}>
        <BrowserRouter>
            <AuthProvider authMode="LOCAL" {...authProvider}>
                <PageProvider>
                    <Story />
                </PageProvider>
            </AuthProvider>
        </BrowserRouter>
    </MockedProvider>
)

export default ProvidersDecorator
