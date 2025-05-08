import React from 'react'
import { createRoot } from 'react-dom/client'
import {
    ApolloClient,
    InMemoryCache,
    HttpLink,
    DefaultOptions,
    ApolloLink,
} from '@apollo/client'
import { Amplify } from 'aws-amplify'

import './index.scss'

import App from './pages/App/App'
import reportWebVitals from './reportWebVitals'
import { localGQLFetch, fakeAmplifyFetch } from './api'
import { assertIsAuthMode } from '@mc-review/common-code'
import { S3ClientT, newAmplifyS3Client, newLocalS3Client } from './s3'
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk'
import type { S3BucketConfigType } from './s3/s3Amplify'
import { gzip } from 'fflate'

import schema from './gen/schema.graphql'

const apiURL = import.meta.env.VITE_APP_API_URL
if (!apiURL || apiURL === '') {
    throw new Error('VITE_APP_API_URL must be set to the url for the API')
}

const compressionLink = new ApolloLink((operation, forward) => {
    // Only compress mutations and queries (not subscriptions)
    const isQuery = operation.query.definitions.some(
        (definition) =>
            definition.kind === 'OperationDefinition' &&
            (definition.operation === 'query' ||
                definition.operation === 'mutation')
    )

    if (!isQuery) {
        return forward(operation)
    }

    return forward(operation).map((response) => {
        // Add compression headers for future requests
        operation.setContext(({ headers = {} }) => ({
            headers: {
                ...headers,
                'Accept-Encoding': 'gzip',
            },
        }))

        return response
    })
})

// Create a custom fetch function that compresses the request body
const compressedFetch = async (uri: string, options: RequestInit) => {
    // Get the original fetch function based on auth mode
    const originalFetch =
        authMode === 'LOCAL' ? localGQLFetch : fakeAmplifyFetch

    // Only compress POST requests with a body
    if (options.method === 'POST' && options.body) {
        try {
            const body = options.body.toString()

            // Use fflate to compress the body
            const compressedBody = await new Promise<Uint8Array>(
                (resolve, reject) => {
                    gzip(new TextEncoder().encode(body), (err, data) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(data)
                        }
                    })
                }
            )

            // Create a Blob with the correct type
            const blob = new Blob([compressedBody], {
                type: 'application/json',
            })

            // Create new options with compressed body
            const newOptions = {
                ...options,
                body: blob,
                headers: {
                    ...options.headers,
                    'Content-Type': 'application/json',
                    'Content-Encoding': 'gzip',
                    'Accept-Encoding': 'gzip',
                },
            }

            return originalFetch(uri, newOptions)
        } catch (error) {
            console.error('Error compressing request:', error)
            return originalFetch(uri, options)
        }
    }

    // For non-POST requests, use original fetch
    return originalFetch(uri, options)
}

// We are using Amplify for communicating with Cognito, for now.
Amplify.configure({
    Auth: {
        mandatorySignIn: true,
        region: import.meta.env.VITE_APP_COGNITO_REGION,
        userPoolId: import.meta.env.VITE_APP_COGNITO_USER_POOL_ID,
        identityPoolId: import.meta.env.VITE_APP_COGNITO_ID_POOL_ID,
        userPoolWebClientId: import.meta.env
            .VITE_APP_COGNITO_USER_POOL_CLIENT_ID,
        oauth: {
            domain: import.meta.env.VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN,
            redirectSignIn: import.meta.env.VITE_APP_APPLICATION_ENDPOINT,
            redirectSignOut: import.meta.env.VITE_APP_APPLICATION_ENDPOINT,
            scope: ['email', 'openid'],
            responseType: 'token',
        },
    },
    Storage: {
        region: import.meta.env.VITE_APP_S3_REGION,
        bucket: import.meta.env.VITE_APP_S3_DOCUMENTS_BUCKET,
        identityPoolId: import.meta.env.VITE_APP_COGNITO_ID_POOL_ID,
        customPrefix: {
            public: 'allusers/',
        },
    },
    API: {
        endpoints: [
            {
                name: 'api',
                endpoint: apiURL,
            },
        ],
    },
})

const authMode: string = import.meta.env.VITE_APP_AUTH_MODE
assertIsAuthMode(authMode)
const cache = new InMemoryCache({
    typePolicies: {
        ContractRevision: {
            fields: {
                formData: {
                    merge: true,
                },
            },
        },
        RateRevision: {
            fields: {
                formData: {
                    merge: true,
                },
            },
        },
    },
})
const defaultOptions: DefaultOptions = {
    watchQuery: {
        fetchPolicy: 'network-only',
    },
    query: {
        fetchPolicy: 'network-only',
    },
}

// Create the HTTP link with compressed fetch
const httpLink = new HttpLink({
    uri: '/graphql',
    fetch: compressedFetch,
})

// Combine the links
const link = compressionLink.concat(httpLink)

const apolloClient = new ApolloClient({
    link: link,
    cache,
    defaultOptions,
    typeDefs: schema,
})

// S3 Region and LocalUrl are mutually exclusive.
// One is used in AWS and one is used locally.
const s3Region = import.meta.env.VITE_APP_S3_REGION
const s3LocalURL = import.meta.env.VITE_APP_S3_LOCAL_URL
const s3DocumentsBucket = import.meta.env.VITE_APP_S3_DOCUMENTS_BUCKET
const s3QABucket = import.meta.env.VITE_APP_S3_QA_BUCKET

if (s3DocumentsBucket === undefined || s3QABucket === undefined) {
    throw new Error(
        'To configure s3, you  must set VITE_APP_S3_DOCUMENTS_BUCKET and VITE_APP_S3_QA_BUCKET'
    )
}

if (s3Region !== undefined && s3LocalURL !== undefined) {
    throw new Error(
        'You cant set both VITE_APP_S3_REGION and VITE_APP_S3_LOCAL_URL. Pick one depending on what environment you are in'
    )
}

let s3Client: S3ClientT
const S3_BUCKETS_CONFIG: S3BucketConfigType = {
    HEALTH_PLAN_DOCS: s3DocumentsBucket,
    QUESTION_ANSWER_DOCS: s3QABucket,
}
if (s3Region) {
    s3Client = newAmplifyS3Client(S3_BUCKETS_CONFIG)
} else if (s3LocalURL) {
    s3Client = newLocalS3Client(s3LocalURL, S3_BUCKETS_CONFIG)
} else {
    throw new Error(
        'You must set either VITE_APP_S3_REGION or VITE_APP_S3_LOCAL_URL depending on what environment you are in'
    )
}

const otelCollectorUrl = import.meta.env.VITE_APP_OTEL_COLLECTOR_URL
if (otelCollectorUrl === undefined) {
    throw new Error(
        'To configure OTEL, you must set VITE_APP_OTEL_COLLECTOR_URL'
    )
}

const ldClientId = import.meta.env.VITE_APP_LD_CLIENT_ID
if (ldClientId === undefined) {
    throw new Error(
        'To configure LaunchDarkly, you must set VITE_APP_LD_CLIENT_ID'
    )
}

;(async () => {
    const LDProvider = await asyncWithLDProvider({
        clientSideID: ldClientId,
        options: {
            bootstrap: 'localStorage',
            baseUrl:
                authMode === 'LOCAL'
                    ? '/ld-clientsdk'
                    : 'https://clientsdk.launchdarkly.us',
            streamUrl:
                authMode === 'LOCAL'
                    ? '/ld-clientstream'
                    : 'https://clientstream.launchdarkly.us',
            eventsUrl:
                authMode === 'LOCAL'
                    ? '/ld-events'
                    : 'https://events.launchdarkly.us',
        },
    })

    const container = document.getElementById('root')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const root = createRoot(container!)

    root.render(
        <React.StrictMode>
            <LDProvider>
                <App
                    authMode={authMode}
                    apolloClient={apolloClient}
                    s3Client={s3Client}
                />
            </LDProvider>
        </React.StrictMode>
    )
})().catch((e) => {
    throw new Error('Could not initialize the application: ' + e)
})

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.info))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
