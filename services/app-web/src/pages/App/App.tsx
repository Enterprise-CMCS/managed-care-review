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
import { TraceProvider } from '../../contexts/TraceContext'
import { TealiumProvider } from '../../contexts/TealiumContext'
import { useTracing, setGlobalTracingContext } from '@mc-review/otel'

import { AuthModeType } from '@mc-review/common-code'
import { S3Provider } from '../../contexts/S3Context'
import type { S3ClientT } from '../../s3'
import { useScript } from '../../hooks'
import { generateNRScriptContent } from '../../newRelic'
import { getEnv } from '../../configHelpers/envHelpers'
import { getTealiumEnv, tealiumClient, devTealiumClient } from '../../tealium'

interface TracingInitializerProps {
    children: React.ReactNode
}

export function TracingInitializer({ children }: TracingInitializerProps) {
    const tracing = useTracing()

    React.useEffect(() => {
        setGlobalTracingContext(tracing)
    }, [tracing])

    return <>{children}</>
}

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
    const environmentName = import.meta.env.VITE_APP_STAGE_NAME || ''
    const isHigherEnv = ['prod', 'val', 'main'].includes(environmentName)
    const isLocal = environmentName == 'local'
    const nrSnippet = generateNRScriptContent({
        accountID: getEnv('VITE_APP_NR_ACCOUNT_ID'),
        trustKey: getEnv('VITE_APP_NR_TRUST_KEY'),
        applicationID: getEnv('VITE_APP_NR_AGENT_ID'),
        licenseKey: getEnv('VITE_APP_NR_LICENSE_KEY'),
    })
    useScript({
        inlineScriptAsString: nrSnippet,
        src: '',
        id: 'newrelic',
        showScript: isHigherEnv,
    })
    const tealiumEnv = getTealiumEnv(environmentName)
    const newTealiumClient =
        tealiumEnv === 'dev'
            ? devTealiumClient(isLocal)
            : tealiumClient(tealiumEnv)

    return (
        <ErrorBoundary FallbackComponent={ErrorBoundaryRoot}>
            <TraceProvider>
                <TracingInitializer>
                    <BrowserRouter>
                        <ApolloProvider client={apolloClient}>
                            <AuthProvider authMode={authMode}>
                                <S3Provider client={s3Client}>
                                    <PageProvider>
                                        <TealiumProvider
                                            client={newTealiumClient}
                                        >
                                            <AppBody authMode={authMode} />
                                        </TealiumProvider>
                                    </PageProvider>
                                </S3Provider>
                            </AuthProvider>
                        </ApolloProvider>
                    </BrowserRouter>
                </TracingInitializer>
            </TraceProvider>
        </ErrorBoundary>
    )
}

export default App
