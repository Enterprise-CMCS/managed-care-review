import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import {
    ApolloProvider,
    ApolloClient,
    NormalizedCacheObject,
} from '@apollo/client'

import { AppBody } from './AppBody'
import { logEvent } from '../../log_event'
import { AuthProvider } from '../../contexts/AuthContext'
import { PageProvider } from '../../contexts/PageContext'
import TraceProvider from '../../contexts/TraceContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { AuthModeType } from '../../common-code/domain-models'
import { S3Provider } from '../../contexts/S3Context'
import type { S3ClientT } from '../../s3'

function ErrorFallback({
    error,
}: {
    error: Error
    resetErrorBoundary?: () => void
}): React.ReactElement {
    return <GenericErrorPage />
}

function App({
    authMode,
    apolloClient,
    s3Client,
}: {
    authMode: AuthModeType
    apolloClient: ApolloClient<NormalizedCacheObject>
    s3Client: S3ClientT
}): React.ReactElement {
    useEffect(() => {
        logEvent('on_load', { success: true })
    }, [])

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <BrowserRouter>
                <TraceProvider>
                    <ApolloProvider client={apolloClient}>
                        <S3Provider client={s3Client}>
                            <AuthProvider authMode={authMode}>
                                <PageProvider>
                                    <AppBody authMode={authMode} />
                                </PageProvider>
                            </AuthProvider>
                        </S3Provider>
                    </ApolloProvider>
                </TraceProvider>
            </BrowserRouter>
        </ErrorBoundary>
    )
}

export default App
