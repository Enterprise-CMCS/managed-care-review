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

const gqlSchema = loader('../../app-web/src/gen/schema.graphql')

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
    cache: new InMemoryCache(),
    typeDefs: gqlSchema,
})

ReactDOM.render(
    <React.StrictMode>
        <App authMode={authMode} apolloClient={apolloClient} />
    </React.StrictMode>,
    document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
