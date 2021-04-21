import { ApolloServer } from 'apollo-server-lambda'
import { ApolloServerTestClient } from 'apollo-server-testing'

import { getTestStore } from '../testHelpers/storeHelpers'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import typeDefs from '../../app-graphql/src/schema.graphql'
import { configureResolvers } from '../resolvers'
import { Context } from '../handlers/apollo_gql'
import { CreateDraftSubmissionInput, DraftSubmission, SubmissionType } from '../gen/gqlServer'
import { Store, } from '../store/store'

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

const createTestDraftSubmission = async (mutate: ApolloServerTestClient['mutate']): Promise<DraftSubmission> => {
    const input: CreateDraftSubmissionInput = {
        programID: 'smmc',
        submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
        submissionDescription: 'A created submission',
    }
    const result = await mutate({
        mutation: CREATE_DRAFT_SUBMISSION,
        variables: { input},
    })
    if (result.errors) throw new Error('createTestDraftSubmission mutation failed with errors')

    return result.data.createDraftSubmission.draftSubmission
}

export { constructTestServer, createTestDraftSubmission }
