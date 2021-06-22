import { ApolloServer } from 'apollo-server-lambda'
import { ApolloServerTestClient } from 'apollo-server-testing'

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
        playground: {
            endpoint: '/local/graphql',
        },
        context,
    })

const createTestDraftSubmission = async (
    mutate: ApolloServerTestClient['mutate']
): Promise<DraftSubmission> => {
    const input: CreateDraftSubmissionInput = {
        programID: 'smmc',
        submissionType: 'CONTRACT_ONLY' as const,
        submissionDescription: 'A created submission',
    }
    const result = await mutate({
        mutation: CREATE_DRAFT_SUBMISSION,
        variables: { input },
    })
    if (result.errors)
        throw new Error('createTestDraftSubmission mutation failed with errors')

    return result.data.createDraftSubmission.draftSubmission
}

const updateTestDraftSubmission = async (
    mutate: ApolloServerTestClient['mutate'],
    id: string,
    updates: DraftSubmissionUpdates
): Promise<DraftSubmission> => {
    const updateResult = await mutate({
        mutation: UPDATE_DRAFT_SUBMISSION,
        variables: {
            input: {
                submissionID: id,
                draftSubmissionUpdates: updates,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error('updateTestDraftSubmission mutation failed with errors')
    }

    return updateResult.data.updateDraftSubmission.draftSubmission
}

const createAndUpdateTestDraftSubmission = async (
    mutate: ApolloServerTestClient['mutate'],
    partialDraftSubmissionUpdates?: Partial<
        UpdateDraftSubmissionInput['draftSubmissionUpdates']
    >
): Promise<DraftSubmission> => {
    const draft = await createTestDraftSubmission(mutate)
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

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
        contractType: 'BASE' as const,
        contractDateStart: startDate,
        contractDateEnd: endDate,
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN' as const],
        ...partialDraftSubmissionUpdates,
    }

    const updatedDraft = await updateTestDraftSubmission(
        mutate,
        draft.id,
        updates
    )

    return updatedDraft
}

const submitTestDraftSubmission = async (
    mutate: ApolloServerTestClient['mutate'],
    submissionID: string
) => {
    const updateResult = await mutate({
        mutation: SUBMIT_DRAFT_SUBMISSION,
        variables: {
            input: {
                submissionID,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error('updateTestDraftSubmission mutation failed with errors')
    }

    return updateResult.data.submitDraftSubmission.submission
}

const createTestStateSubmission = async (
    mutate: ApolloServerTestClient['mutate']
): Promise<StateSubmission> => {
    const draft = await createAndUpdateTestDraftSubmission(mutate)

    const updatedSubmission = await submitTestDraftSubmission(mutate, draft.id)

    return updatedSubmission
}

const fetchTestDraftSubmissionById = async (
    query: ApolloServerTestClient['query'],
    submissionID: string
): Promise<DraftSubmission> => {
    const input = { submissionID }
    const result = await query({
        query: FETCH_DRAFT_SUBMISSION,
        variables: { input },
    })

    if (result.errors)
        throw new Error('fetchTestDraftSubmission query failed with errors')

    return result.data.fetchDraftSubmission.draftSubmission
}

const fetchTestStateSubmissionById = async (
    query: ApolloServerTestClient['query'],
    submissionID: string
): Promise<StateSubmission> => {
    const input = { submissionID }
    const result = await query({
        query: FETCH_STATE_SUBMISSION,
        variables: { input },
    })

    if (result.errors) {
        console.log('err fetching state submission: ', result.errors)
        throw new Error('fetchTestStateSubmissionById query failed with errors')
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
