import { ApolloServer } from 'apollo-server-lambda'

import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import FETCH_DRAFT_SUBMISSION from '../../app-graphql/src/queries/fetchDraftSubmission.graphql'
import UPDATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/updateDraftSubmission.graphql'
import FETCH_STATE_SUBMISSION from '../../app-graphql/src/queries/fetchStateSubmission.graphql'
import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitDraftSubmission.graphql'
import typeDefs from '../../app-graphql/src/schema.graphql'
import { Emailer, EmailData, submissionReceivedCMSEmail } from '../emailer'
import { configureResolvers } from '../resolvers'
import { Context } from '../handlers/apollo_gql'
import {
    UpdateDraftSubmissionInput,
    CreateDraftSubmissionInput,
    DraftSubmission,
    DraftSubmissionUpdates,
    StateSubmission,
} from '../gen/gqlServer'
import { NewPrismaClient } from '../lib/prisma'
import { NewPostgresStore } from '../postgres/postgresStore'
import { PrismaClient } from '@prisma/client'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'

const defaultContext = (): Context => {
    return {
        user: {
            name: 'james brown',
            state_code: 'FL',
            role: 'STATE_USER',
            email: 'james@example.com',
        },
    }
}

async function configurePrismaClient(): Promise<PrismaClient> {
    const maybeClient = await NewPrismaClient()
    if (maybeClient.isErr()) {
        console.log('Error: ', maybeClient.error)
        throw new Error('failed to configure postgres client for testing')
    }

    return maybeClient.value
}

const sharedClientPromise = configurePrismaClient()

async function sharedTestPrismaClient(): Promise<PrismaClient> {
    return await sharedClientPromise
}

const constructTestPostgresServer = async (
    { context } = { context: defaultContext() }
): Promise<ApolloServer> => {
    const prismaClient = await sharedTestPrismaClient()

    const postgresStore = NewPostgresStore(prismaClient)
    const emailer = constructTestEmailer()
    const postgresResolvers = configureResolvers(postgresStore, emailer)

    return new ApolloServer({
        typeDefs,
        resolvers: postgresResolvers,
        context,
    })
}

const constructTestEmailer = (): Emailer => {
    const config = {
        emailSource: 'local@example.com',
        stage: 'local',
        baseUrl: 'http://localhost',
    }
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            console.log('Mock email locally')
            // TODO: add a visual frame to the email data
            console.log('Email content' + emailData)
        },
        generateCMSEmail: (submission: StateSubmissionType): EmailData => {
            return submissionReceivedCMSEmail(submission, config)
        },
    }
}

const createTestDraftSubmission = async (
    server: ApolloServer
): Promise<DraftSubmission> => {
    const input: CreateDraftSubmissionInput = {
        programID: 'smmc',
        submissionType: 'CONTRACT_ONLY' as const,
        submissionDescription: 'A created submission',
    }
    const result = await server.executeOperation({
        query: CREATE_DRAFT_SUBMISSION,
        variables: { input },
    })
    if (result.errors) {
        throw new Error(
            `createTestDraftSubmission mutation failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('createTestDraftSubmission returned nothing')
    }

    return result.data.createDraftSubmission.draftSubmission
}

const updateTestDraftSubmission = async (
    server: ApolloServer,
    id: string,
    updates: DraftSubmissionUpdates
): Promise<DraftSubmission> => {
    const updateResult = await server.executeOperation({
        query: UPDATE_DRAFT_SUBMISSION,
        variables: {
            input: {
                submissionID: id,
                draftSubmissionUpdates: updates,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `updateTestDraftSubmission mutation failed with errors ${updateResult.errors}`
        )
    }

    if (!updateResult.data) {
        throw new Error('updateTestDraftSubmission returned nothing')
    }

    return updateResult.data.updateDraftSubmission.draftSubmission
}

const createAndUpdateTestDraftSubmission = async (
    server: ApolloServer,
    partialDraftSubmissionUpdates?: Partial<
        UpdateDraftSubmissionInput['draftSubmissionUpdates']
    >
): Promise<DraftSubmission> => {
    const draft = await createTestDraftSubmission(server)
    const startDate = '2025-05-01'
    const endDate = '2026-04-30'
    const dateCertified = '2025-03-15'

    const updates = {
        programID: 'cnet',
        submissionType: 'CONTRACT_AND_RATES' as const,
        submissionDescription: 'An updated submission',
        documents: [],

        stateContacts: [
            {
                name: 'test name',
                titleRole: 'test title',
                email: 'email@test.com',
            },
        ],
        actuaryContacts: [
            {
                name: 'test name',
                titleRole: 'test title',
                email: 'email@test.com',
                actuarialFirm: 'MERCER' as const,
                actuarialFirmOther: '',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
        contractType: 'BASE' as const,
        contractDateStart: startDate,
        contractDateEnd: endDate,
        contractDocuments: [
            {
                name: 'contractDocument.pdf',
                s3URL: 'fakeS3URL',
            },
        ],
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN' as const],
        rateType: 'NEW' as const,
        rateDateStart: startDate,
        rateDateEnd: endDate,
        rateDateCertified: dateCertified,
        rateDocuments: [
            {
                name: 'rateDocument.pdf',
                s3URL: 'fakeS3URL',
            },
        ],
        ...partialDraftSubmissionUpdates,
    }

    const updatedDraft = await updateTestDraftSubmission(
        server,
        draft.id,
        updates
    )

    return updatedDraft
}

const submitTestDraftSubmission = async (
    server: ApolloServer,
    submissionID: string
) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_DRAFT_SUBMISSION,
        variables: {
            input: {
                submissionID,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `updateTestDraftSubmission mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('updateTestDraftSubmission returned nothing')
    }

    return updateResult.data.submitDraftSubmission.submission
}

const createTestStateSubmission = async (
    server: ApolloServer
): Promise<StateSubmission> => {
    const draft = await createAndUpdateTestDraftSubmission(server)

    const updatedSubmission = await submitTestDraftSubmission(server, draft.id)

    return updatedSubmission
}

const fetchTestDraftSubmissionById = async (
    server: ApolloServer,
    submissionID: string
): Promise<DraftSubmission> => {
    const input = { submissionID }
    const result = await server.executeOperation({
        query: FETCH_DRAFT_SUBMISSION,
        variables: { input },
    })

    if (result.errors)
        throw new Error(
            `fetchTestDraftSubmission query failed with errors ${result.errors}`
        )

    if (!result.data) {
        throw new Error('fetchTestDraftSubmission returned nothing')
    }

    return result.data.fetchDraftSubmission.draftSubmission
}

const fetchTestStateSubmissionById = async (
    server: ApolloServer,
    submissionID: string
): Promise<StateSubmission> => {
    const input = { submissionID }
    const result = await server.executeOperation({
        query: FETCH_STATE_SUBMISSION,
        variables: { input },
    })

    if (result.errors) {
        console.log('err fetching state submission: ', result.errors)
        throw new Error('fetchTestStateSubmissionById query failed with errors')
    }

    if (!result.data) {
        throw new Error('fetchTestStateSubmissionById returned nothing')
    }

    return result.data.fetchStateSubmission.submission
}

export {
    sharedTestPrismaClient,
    constructTestPostgresServer,
    createTestDraftSubmission,
    createTestStateSubmission,
    updateTestDraftSubmission,
    createAndUpdateTestDraftSubmission,
    fetchTestDraftSubmissionById,
    fetchTestStateSubmissionById,
}
