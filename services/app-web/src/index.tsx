import React from 'react'
import { createRoot } from 'react-dom/client'
import {
    ApolloClient,
    InMemoryCache,
    HttpLink,
    DefaultOptions,
} from '@apollo/client'
import { Amplify } from 'aws-amplify'

import './index.scss'

import App from './pages/App/App'
import reportWebVitals from './reportWebVitals'
import { localGQLFetch, fakeAmplifyFetch } from './api'
import { assertIsAuthMode } from './common-code/config'
import { S3ClientT, newAmplifyS3Client, newLocalS3Client } from './s3'
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk'
import type { S3BucketConfigType } from './s3/s3Amplify'

import schema from './gen/schema.graphql'

const apiURL = import.meta.env.VITE_APP_API_URL
if (!apiURL || apiURL === '') {
    throw new Error('VITE_APP_API_URL must be set to the url for the API')
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

const authMode = import.meta.env.VITE_APP_AUTH_MODE
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

const apolloClient = new ApolloClient({
    link: new HttpLink({
        uri: '/graphql',
        fetch: authMode === 'LOCAL' ? localGQLFetch : fakeAmplifyFetch,
    }),
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
            baseUrl: 'https://clientsdk.launchdarkly.us',
            streamUrl: 'https://clientstream.launchdarkly.us',
            eventsUrl: 'https://events.launchdarkly.us',
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
