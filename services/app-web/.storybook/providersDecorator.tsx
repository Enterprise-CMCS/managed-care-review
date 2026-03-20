import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { StoryFn } from '@storybook/react'
import { fetchCurrentUserMock } from '@mc-review/mocks'

import { AuthProvider, AuthProviderProps } from '../src/contexts/AuthContext'
import { PageProvider } from '../src/contexts/PageContext'
import { S3Provider } from '../src/contexts/S3Context'
import { testS3Client } from '../src/testHelpers/s3Helpers'
import { MockTraceProvider } from '../src/contexts/TraceContext'

const ProvidersDecorator = (
    Story: StoryFn,
    {
        apolloProvider,
        authProvider,
    }: {
        apolloProvider?: MockedProviderProps
        authProvider?: AuthProviderProps
    }
) => {
    const mockedProviderProps: MockedProviderProps = {
        ...apolloProvider,
        mocks: [
            ...(apolloProvider?.mocks ?? []),
            fetchCurrentUserMock({ statusCode: 200 }),
        ],
    }

    return (
        <MockedProvider {...mockedProviderProps}>
            <MockTraceProvider>
                <BrowserRouter>
                    <AuthProvider authMode="LOCAL" {...authProvider}>
                        <S3Provider client={testS3Client()}>
                            <PageProvider>
                                <Story />
                            </PageProvider>
                        </S3Provider>
                    </AuthProvider>
                </BrowserRouter>
            </MockTraceProvider>
        </MockedProvider>
    )
}

export default ProvidersDecorator
