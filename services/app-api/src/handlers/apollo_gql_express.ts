// PREPARATION FOR APOLLO SERVER 4 MIGRATION
// This entrypoint sets up Apollo Server using Express, with CORS and body parsing middleware.
// It is NOT currently used in production. When upgrading to Apollo Server 4, switch to this handler.

// If you see a type error for 'aws-serverless-express', add a declaration file as below:
// declare module 'aws-serverless-express';

import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import cors from 'cors'
import { createServer, proxy } from 'aws-serverless-express'
import typeDefs from '../../../app-graphql/src/schema.graphql'
import { configureResolvers } from '../resolvers'
import { configurePostgres, configureEmailer } from './configuration'
import { newJWTLib } from '../jwt'
import { ldService, offlineLDService } from '../launchDarkly/launchDarkly'
import * as ld from '@launchdarkly/node-server-sdk'
import { NewPostgresStore } from '../postgres/postgresStore'
import {
    newAWSEmailParameterStore,
    newLocalEmailParameterStore,
} from '../parameterStore'
import {
    ApolloServerPluginLandingPageDisabled,
    ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core'
import type { S3ClientT } from '../s3'
import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'

// --- Express app setup ---
const app = express()

// CORS and body parser middleware (mirroring current config)
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

let serverlessExpressInstance: ReturnType<typeof createServer>

// --- Apollo Server setup ---
async function buildApolloServer() {
    // These env vars and config mirror your current handler
    const stageName = process.env.stage
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const applicationEndpoint = process.env.APPLICATION_ENDPOINT
    const emailerMode = process.env.EMAILER_MODE
    const parameterStoreMode = process.env.PARAMETER_STORE_MODE
    const ldSDKKey = process.env.LD_SDK_KEY
    const jwtSecret = process.env.JWT_SECRET

    // START Assert configuration is valid (mirroring apollo_gql.ts)
    if (emailerMode !== 'LOCAL' && emailerMode !== 'SES')
        throw new Error(
            'Configuration Error: EMAILER_MODE is not valid. Current value: ' +
                emailerMode
        )

    if (applicationEndpoint === undefined || applicationEndpoint === '')
        throw new Error('Configuration Error: APPLICATION_ENDPOINT is required')

    if (stageName === undefined)
        throw new Error('Configuration Error: stage is required')

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    if (parameterStoreMode !== 'LOCAL' && parameterStoreMode !== 'AWS') {
        throw new Error(
            'Configuration Error: PARAMETER_STORE_MODE is not valid. Current value: ' +
                parameterStoreMode
        )
    }
    if (ldSDKKey === undefined || ldSDKKey === '') {
        throw new Error(
            'Configuration Error: LD_SDK_KEY is required to run app-api.'
        )
    }

    if (jwtSecret === undefined || jwtSecret === '') {
        throw new Error(
            'Configuration Error: JWT_SECRET is required to run app-api.'
        )
    }
    // END

    // Postgres
    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) throw pgResult
    const store = NewPostgresStore(pgResult)

    // LaunchDarkly
    let launchDarkly
    try {
        const ldClient = ld.init(ldSDKKey, {})
        await ldClient.waitForInitialization({ timeout: 10 })
        launchDarkly = ldService(ldClient)
    } catch {
        launchDarkly = offlineLDService()
    }

    // Apollo plugins
    let plugins = []
    let introspectionAllowed = false
    if (stageName === 'prod' || stageName === 'val') {
        plugins = [ApolloServerPluginLandingPageDisabled()]
    } else {
        plugins = [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        introspectionAllowed = true
    }

    // JWT
    const jwtLib = newJWTLib({
        issuer: `mcreview-${stageName}`,
        signingKey: Buffer.from(jwtSecret, 'hex'),
        expirationDurationS: 90 * 24 * 60 * 60,
    })

    // Email parameter store
    const emailParameterStore =
        parameterStoreMode === 'LOCAL'
            ? newLocalEmailParameterStore()
            : newAWSEmailParameterStore()
    const emailer = await configureEmailer({
        emailParameterStore,
        store,
        ldService: launchDarkly,
        stageName,
        emailerMode,
        applicationEndpoint,
    })
    if (emailer instanceof Error) throw emailer

    // S3ClientT is required by configureResolvers, but not needed for this prep file.
    // Provide a dummy object to satisfy the type.
    const dummyS3Client = {} as S3ClientT

    // Resolvers
    const resolvers = configureResolvers(
        store,
        emailer,
        launchDarkly,
        jwtLib,
        dummyS3Client, // Satisfy type requirement
        applicationEndpoint
    )

    // Context
    // const userFetcher =
    //   authMode === 'LOCAL' ? userFromLocalAuthProvider : userFromCognitoAuthProvider;
    const contextForRequest = () => ({ user: { id: 'placeholder' } }) // Replace with your real context logic if needed

    // Apollo Server instance
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: contextForRequest,
        plugins,
        introspection: introspectionAllowed,
    })
    await server.start()
    app.use('/graphql', server.getMiddleware())
}

// Start Apollo Server and mount middleware
const initializationPromise = (async () => {
    try {
        await buildApolloServer()
        serverlessExpressInstance = createServer(app)
    } catch (error) {
        console.error('Error starting Apollo Server:', error)
        process.exit(1) // Exit the process with a failure code
    }
})()

// Lambda handler for aws-serverless-express
export const handler = async (
    event: APIGatewayProxyEvent,
    context: LambdaContext
) => {
    await initializationPromise // Ensure initialization is complete
    return proxy(serverlessExpressInstance, event, context)
}
