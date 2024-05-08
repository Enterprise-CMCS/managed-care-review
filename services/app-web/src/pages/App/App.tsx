import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import {
    ApolloProvider,
    ApolloClient,
    NormalizedCacheObject,
} from '@apollo/client'

import { AppBody } from './AppBody'
import { AuthProvider } from '../../contexts/AuthContext'
import { ErrorBoundaryRoot } from '../Errors/ErrorBoundaryRoot'
import { PageProvider } from '../../contexts/PageContext'
import TraceProvider from '../../contexts/TraceContext'

import { AuthModeType } from '../../common-code/config'
import { S3Provider } from '../../contexts/S3Context'
import type { S3ClientT } from '../../s3'
import { useScript } from '../../hooks'
import { generateNRScriptContent } from '../../newRelic'
import { getEnv } from '../../configHelpers/envHelpers'


export type AppProps = {
    authMode: AuthModeType
    apolloClient: ApolloClient<NormalizedCacheObject>
    s3Client: S3ClientT
}


function App({
    authMode,
    apolloClient,
    s3Client,
}: AppProps): React.ReactElement {
    const environmentName = process.env.REACT_APP_STAGE_NAME || ''
    const isHigherEnv = ['prod', 'val', 'dev'].includes(environmentName )
    const nrSnippet = generateNRScriptContent({accountID: getEnv('REACT_APP_NR_ACCOUNT_ID'), trustKey: getEnv('REACT_APP_NR_TRUST_KEY'), applicationID: getEnv('REACT_APP_NR_APPLICATION_ID'), licenseKey: getEnv('REACT_APP_NR_LICENSE_KEY')})
    useScript({inlineScriptAsString: nrSnippet, src:'', id: 'newrelic', showScript: isHigherEnv})

    return (
        <ErrorBoundary FallbackComponent={ErrorBoundaryRoot}>
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
