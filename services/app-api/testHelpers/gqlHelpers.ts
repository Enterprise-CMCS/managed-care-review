import { ApolloServer } from 'apollo-server-lambda'

import { getTestStore } from '../testHelpers/storeHelpers'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import FETCH_DRAFT_SUBMISSION from '../../app-graphql/src/queries/fetchDraftSubmission.graphql'
import UPDATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/updateDraftSubmission.graphql'
import FETCH_STATE_SUBMISSION from '../../app-graphql/src/queries/fetchStateSubmission.graphql'
import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitDraftSubmission.graphql'
import typeDefs from '../../app-graphql/src/schema.graphql'
import { configureResolvers } from '../resolvers'
import { Context } from '../handlers/apollo_gql'
import {
    UpdateDraftSubmissionInput,
    CreateDraftSubmissionInput,
    DraftSubmission,
    DraftSubmissionUpdates,
    StateSubmission,
} from '../gen/gqlServer'

const store = getTestStore()

const testResolvers = configureResolvers(store)

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

const constructTestServer = (
    { context } = { context: defaultContext() }
): ApolloServer =>
    new ApolloServer({
        typeDefs,
        resolvers: testResolvers,
        context,
    })

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
        documents: [
            {
                name: 'myfile.pdf',
                s3URL: 'fakeS3URL',
            },
        ],
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
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN' as const],
        rateType: 'NEW' as const,
        rateDateStart: startDate,
        rateDateEnd: endDate,
        rateDateCertified: dateCertified,
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
    constructTestServer,
    createTestDraftSubmission,
    createTestStateSubmission,
    updateTestDraftSubmission,
    createAndUpdateTestDraftSubmission,
    fetchTestDraftSubmissionById,
    fetchTestStateSubmissionById,
}
