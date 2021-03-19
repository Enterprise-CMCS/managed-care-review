import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Story } from '@storybook/react'

import { AuthProvider, AuthProviderProps } from '../src/contexts/AuthContext'

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
            <AuthProvider authMode={'AWS_COGNITO'} {...authProvider}>
                <Story />
            </AuthProvider>
        </BrowserRouter>
    </MockedProvider>
)

export default ProvidersDecorator
