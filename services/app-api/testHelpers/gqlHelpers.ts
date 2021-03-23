import { ApolloServer, Config } from 'apollo-server-lambda'
import {
    newLocalStore
} from '../store/index'

import typeDefs from '../../app-graphql/src/schema.graphql'
import { Resolvers } from '../gen/gqlServer'
import {
    getCurrentUserResolver,
    createDraftSubmissionResolver,
} from '../resolvers'
import { userResolver } from '../resolvers/userResolver'
import { userFromLocalAuthProvider } from '../authn'

// TODO: should config based on environment (?)
const store = newLocalStore(process.env.LOCAL_DYNAMO_URL || 'no db url')

const testResolvers: Resolvers = {
    Query: {
        getCurrentUser: getCurrentUserResolver(userFromLocalAuthProvider),
    },
    User: userResolver,
    Mutation: {
        createDraftSubmission: createDraftSubmissionResolver(store),
    },
}

const defaultContext = (context: Config['context']) => {
    const event = {
        requestContext: {
            identity: {
                cognitoAuthenticationProvider:
                    '{ "name": "james brown", "state_code": "FL", "role": "STATE_USER", "email": "james@example.com" }',
            },
        },
    }

    return {
        event,
        context,
    }
}
const constructTestServer = ({ context = defaultContext } = {}): ApolloServer =>
    new ApolloServer({
        typeDefs,
        resolvers: testResolvers,
        playground: {
            endpoint: '/local/graphql',
        },
        context,
    })

export { constructTestServer }
