import { ApolloServer } from '@apollo/server'
import {
    executeGraphQLOperation,
    extractGraphQLResponse,
} from './apolloV4ResponseHelper'
import type { ContractQuestion, RateQuestion } from '../gen/gqlClient'
import {
    CreateContractQuestionDocument,
    CreateContractQuestionResponseDocument,
    CreateRateQuestionDocument,
    CreateRateQuestionResponseDocument,
    UpdateStateAssignmentsByStateDocument,
} from '../gen/gqlClient'
import typeDefs from 'app-graphql/src/schema.graphql'
import type {
    CreateContractQuestionInput,
    CreateRateQuestionInputType,
    EmailSettingsType,
    InsertQuestionResponseArgs,
    ProgramType,
} from '../domain-models'
import type { EmailConfiguration, Emailer } from '../emailer'
import type { UpdateStateAssignmentsByStatePayload } from '../gen/gqlServer'
import type { Context } from '../handlers/apollo_gql'
import type { Store } from '../postgres'
import { findStatePrograms, NewPostgresStore } from '../postgres'
import { configureResolvers } from '../resolvers'
import { sharedTestPrismaClient } from './storeHelpers'
import {
    type EmailParameterStore,
    newLocalEmailParameterStore,
} from '../parameterStore'
import { testLDService } from './launchDarklyHelpers'
import type { LDService } from '../launchDarkly/launchDarkly'
import { insertUserToLocalAurora } from '../authn'
import { testStateUser } from './userHelpers'
import { must } from './assertionHelpers'
import type { JWTLib } from '../jwt'
import { newJWTLib } from '../jwt'
import { testS3Client } from './s3Helpers'
import type { S3ClientT } from '../s3'
import { configureEmailer } from '../handlers/configuration'
import type { DocumentZipService } from '../zip/generateZip'
import {
    documentZipService,
    localGenerateDocumentZip,
} from '../zip/generateZip'

// Since our programs are checked into source code, we have a program we
// use as our default
function defaultFloridaProgram(): ProgramType {
    return must(findStatePrograms('FL'))[0]
}

function defaultFloridaRateProgram(): ProgramType {
    const programs = must(findStatePrograms('FL'))
    const rateProgram = programs.find((program) => program.isRateProgram)

    if (!rateProgram) {
        throw new Error(
            'Unexpected error: Rate program not found in Florida programs'
        )
    }

    return rateProgram
}

const defaultContext = (): Context => {
    return {
        user: testStateUser(),
    }
}

const constructTestPostgresServer = async (opts?: {
    context?: Context
    emailer?: Emailer
    store?: Partial<Store>
    emailParameterStore?: EmailParameterStore // to be deleted when we remove parameter store, just rely on postgres
    ldService?: LDService
    jwt?: JWTLib
    s3Client?: S3ClientT
    documentZip?: DocumentZipService
}): Promise<ApolloServer> => {
    // set defaults
    const context = opts?.context || defaultContext()
    const ldService = opts?.ldService || testLDService()
    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = {
        ...NewPostgresStore(prismaClient),
        ...opts?.store,
    }
    const jwt =
        opts?.jwt ||
        newJWTLib({
            issuer: 'mcreviewtest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

    const localDocumentZip =
        opts?.documentZip ??
        documentZipService(postgresStore, localGenerateDocumentZip)

    await insertUserToLocalAurora(postgresStore, context.user)
    const s3TestClient = testS3Client()
    const s3 = opts?.s3Client || s3TestClient

    const testEmailConfigForParameterStore = {
        emailSource: 'local@example.com',
        stage: 'localtest',
        baseUrl: 'http://localtest',
        devReviewTeamEmails: ['test@example.com'],
        cmsReviewHelpEmailAddress: 'mcog@example.com',
        cmsRateHelpEmailAddress: 'rates@example.com',
        oactEmails: ['testRate@example.com'],
        dmcpReviewEmails: ['testPolicy@example.com'],
        dmcpSubmissionEmails: ['testPolicySubmission@example.com'],
        dmcoEmails: ['testDmco@example.com'],
        helpDeskEmail: 'MC_Review_HelpDesk@example.com>',
    }

    const emailer =
        opts?.emailer ??
        (await constructTestEmailer({
            emailConfig: testEmailConfigForParameterStore, // to be deleted when we remove parameter store, just rely on postgres
            postgresStore,
            ldService,
        }))

    const postgresResolvers = configureResolvers(
        postgresStore,
        emailer,
        ldService,
        jwt,
        s3,
        'https://localhost:3000',
        localDocumentZip
    )

    const server = new ApolloServer({
        typeDefs,
        resolvers: postgresResolvers,
    })

    // Return modified server with context injection
    const modifiedServer = {
        ...server,
        executeOperation: async (
            ...args: Parameters<typeof server.executeOperation>
        ) => {
            const [request, restOptions = {}] = args

            if (!restOptions.contextValue) {
                restOptions.contextValue = context
            }

            return server.executeOperation(request, restOptions)
        },
    }

    return modifiedServer as ApolloServer
}

const constructTestEmailer = async (opts: {
    emailConfig: EmailConfiguration // to be deleted when we remove parameter store, only option will be to read from postgres
    postgresStore: Store
    ldService?: LDService
}): Promise<Emailer> => {
    const {
        emailConfig,
        postgresStore,
        ldService = testLDService({ 'remove-parameter-store': true }), // default to using email settings from database
    } = opts ?? {}
    let store = postgresStore
    if (!store) {
        const prismaClient = await sharedTestPrismaClient()
        store = NewPostgresStore(prismaClient)
    }
    const removeParameterStore = await ldService.getFeatureFlag({
        key: 'foo',
        flag: 'remove-parameter-store',
    })

    const emailSettings = await store.findEmailSettings()
    if (emailSettings instanceof Error) {
        throw emailSettings // throw error if email settings not in place in tests
    }

    // go into test emailer with both paramet
    const testEmailSettings: EmailSettingsType = {
        emailSource: removeParameterStore
            ? emailSettings.emailSource
            : emailConfig.emailSource,
        devReviewTeamEmails: removeParameterStore
            ? emailSettings.devReviewTeamEmails
            : emailConfig.devReviewTeamEmails,
        oactEmails: removeParameterStore
            ? emailSettings.oactEmails
            : emailConfig.oactEmails,
        dmcpReviewEmails: removeParameterStore
            ? emailSettings.dmcpReviewEmails
            : emailConfig.dmcpReviewEmails,
        dmcpSubmissionEmails: removeParameterStore
            ? emailSettings.dmcpSubmissionEmails
            : emailConfig.dmcpSubmissionEmails,
        dmcoEmails: removeParameterStore
            ? emailSettings.dmcoEmails
            : emailConfig.dmcoEmails,
        // These three settings are string[] in db but string in EmailConfiguration, follow up ticket will convert EmailConfiguration to string[]
        cmsReviewHelpEmailAddress: removeParameterStore
            ? emailSettings.cmsReviewHelpEmailAddress
            : [emailConfig.cmsReviewHelpEmailAddress],
        cmsRateHelpEmailAddress: removeParameterStore
            ? emailSettings.cmsRateHelpEmailAddress
            : [emailConfig.cmsRateHelpEmailAddress],
        helpDeskEmail: removeParameterStore
            ? emailSettings.helpDeskEmail
            : [emailConfig.helpDeskEmail],
    }

    store.findEmailSettings = async () => {
        return testEmailSettings
    }

    return must(
        await configureEmailer({
            emailParameterStore: newLocalEmailParameterStore(),
            store,
            ldService,
            stageName: emailConfig?.stage ?? 'localtest',
            emailerMode: 'LOCAL',
            applicationEndpoint: emailConfig?.baseUrl ?? 'http://localtest',
        })
    )
}

const createTestQuestion = async (
    server: ApolloServer,
    contractID: string,
    questionData?: Omit<CreateContractQuestionInput, 'contractID'>
): Promise<ContractQuestion> => {
    const question = questionData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }

    const createdQuestion = await executeGraphQLOperation(server, {
        query: CreateContractQuestionDocument,
        variables: {
            input: {
                contractID,
                ...question,
            },
        },
    })

    if (createdQuestion.errors)
        throw new Error(
            `createTestQuestion mutation failed with errors ${JSON.stringify(createdQuestion.errors)}`
        )

    if (!createdQuestion.data.createContractQuestion.question) {
        throw new Error('createTestQuestion returned nothing')
    }

    return createdQuestion.data.createContractQuestion.question
}

const createTestRateQuestion = async (
    server: ApolloServer,
    rateID: string,
    questionData?: Omit<CreateRateQuestionInputType, 'rateID'>
): Promise<RateQuestion> => {
    const question = questionData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }
    const result = await executeGraphQLOperation(server, {
        query: CreateRateQuestionDocument,
        variables: {
            input: {
                rateID,
                ...question,
            },
        },
    })

    // If there are errors, return the full response object so tests can check errors
    if (result.errors) {
        throw new Error(
            `createTestQuestion mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    // If successful and data exists, return just the data
    if (!result.data.createRateQuestion.question) {
        throw new Error('createTestRateQuestion returned nothing')
    }

    return result.data.createRateQuestion.question
}

const createTestRateQuestionResponse = async (
    server: ApolloServer,
    questionID: string,
    responseData?: Omit<InsertQuestionResponseArgs, 'questionID'>
): Promise<RateQuestion> => {
    const response = responseData || {
        documents: [
            {
                name: 'Test Question Response',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }

    const result = await executeGraphQLOperation(server, {
        query: CreateRateQuestionResponseDocument,
        variables: {
            input: {
                ...response,
                questionID,
            },
        },
    })

    // If there are errors, return the full response object so tests can check errors
    if (result.errors) {
        throw new Error(
            `createTestQuestion mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    // If successful and data exists, return just the data
    if (!result.data.createRateQuestionResponse.question) {
        throw new Error('createTestRateQuestionResponse returned nothing')
    }

    // If no data and no errors, return the full response
    return result.data.createRateQuestionResponse.question
}

const createTestQuestionResponse = async (
    server: ApolloServer,
    questionID: string,
    responseData?: Omit<InsertQuestionResponseArgs, 'questionID'>
): Promise<ContractQuestion> => {
    const response = responseData || {
        documents: [
            {
                name: 'Test Question Response',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }
    const createdResponse = await executeGraphQLOperation(server, {
        query: CreateContractQuestionResponseDocument,
        variables: {
            input: {
                ...response,
                questionID,
            },
        },
    })

    if (createdResponse.errors)
        throw new Error(
            `createTestQuestionResponse mutation failed with errors ${JSON.stringify(createdResponse.errors)}`
        )

    if (!createdResponse.data.createContractQuestionResponse.question) {
        throw new Error('createTestQuestionResponse returned nothing')
    }

    return createdResponse.data.createContractQuestionResponse.question
}

const updateTestStateAssignments = async (
    server: ApolloServer,
    stateCode: string,
    assignedUserIDs: string[]
): Promise<UpdateStateAssignmentsByStatePayload> => {
    const updatedAssignments = await executeGraphQLOperation(server, {
        query: UpdateStateAssignmentsByStateDocument,
        variables: {
            input: {
                stateCode,
                assignedUsers: assignedUserIDs,
            },
        },
    })

    if (updatedAssignments.errors)
        throw new Error(
            `updateStateAssignmentsByState mutation failed with errors ${JSON.stringify(updatedAssignments.errors)}`
        )

    if (!updatedAssignments.data.updateStateAssignmentsByState) {
        throw new Error('updateStateAssignmentsByState returned nothing')
    }

    return updatedAssignments.data.updateStateAssignmentsByState
}

export {
    constructTestPostgresServer,
    defaultContext,
    defaultFloridaProgram,
    defaultFloridaRateProgram,
    createTestQuestion,
    createTestQuestionResponse,
    updateTestStateAssignments,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    constructTestEmailer,
    extractGraphQLResponse,
    executeGraphQLOperation,
}
