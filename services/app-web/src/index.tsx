import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { Amplify } from 'aws-amplify'
import { loader } from 'graphql.macro'

import './index.scss'

import App from './pages/App/App'
import reportWebVitals from './reportWebVitals'
import { localGQLFetch, fakeAmplifyFetch } from './api'
import { assertIsAuthMode } from './common-code/domain-models'
import { S3ClientT, newAmplifyS3Client, newLocalS3Client } from './s3'

const gqlSchema = loader('../../app-web/src/gen/schema.graphql')

// mojo: testing broken waf things. not a real change

// We are using Amplify for communicating with Cognito, for now.
Amplify.configure({
    Auth: {
        mandatorySignIn: true,
        region: process.env.REACT_APP_COGNITO_REGION,
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
        identityPoolId: process.env.REACT_APP_COGNITO_ID_POOL_ID,
        userPoolWebClientId: process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID,
        oauth: {
            domain: process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_DOMAIN,
            redirectSignIn: process.env.REACT_APP_APPLICATION_ENDPOINT,
            redirectSignOut: process.env.REACT_APP_APPLICATION_ENDPOINT,
            scope: ['email', 'openid'],
            responseType: 'token',
        },
    },
    Storage: {
        region: process.env.REACT_APP_S3_REGION,
        bucket: process.env.REACT_APP_S3_DOCUMENTS_BUCKET,
        identityPoolId: process.env.REACT_APP_COGNITO_ID_POOL_ID,
    },
    API: {
        endpoints: [
            {
                name: 'api',
                endpoint: process.env.REACT_APP_API_URL,
            },
        ],
    },
})

const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)
console.log('AuthMode: ', authMode)

const apolloClient = new ApolloClient({
    link: new HttpLink({
        uri: '/graphql',
        fetch: authMode === 'LOCAL' ? localGQLFetch : fakeAmplifyFetch,
    }),
    cache: new InMemoryCache({
        possibleTypes: {
            Submission: ['DraftSubmission', 'StateSubmission'],
        },
    }),
    typeDefs: gqlSchema,
})

// S3 Region and LocalUrl are mutually exclusive.
// One is used in AWS and one is used locally.
const s3Region = process.env.REACT_APP_S3_REGION
const s3LocalURL = process.env.REACT_APP_S3_LOCAL_URL
const s3DocumentsBucket = process.env.REACT_APP_S3_DOCUMENTS_BUCKET

if (s3DocumentsBucket === undefined) {
    throw new Error(
        'To configure s3, you  must set REACT_APP_S3_DOCUMENTS_BUCKET'
    )
}

if (s3Region !== undefined && s3LocalURL !== undefined) {
    throw new Error(
        'You cant set both REACT_APP_S3_REGION and REACT_APP_S3_LOCAL_URL. Pick one dependning on what environment you are in'
    )
}

let s3Client: S3ClientT
if (s3Region) {
    s3Client = newAmplifyS3Client(s3DocumentsBucket)
} else if (s3LocalURL) {
    s3Client = newLocalS3Client(s3LocalURL, s3DocumentsBucket)
} else {
    throw new Error(
        'You must set either REACT_APP_S3_REGION or REACT_APP_S3_LOCAL_URL depending on what environment you are in'
    )
}

ReactDOM.render(
    <React.StrictMode>
        <App
            authMode={authMode}
            apolloClient={apolloClient}
            s3Client={s3Client}
        />
    </React.StrictMode>,
    document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
