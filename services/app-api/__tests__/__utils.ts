import { ApolloServer, Config } from 'apollo-server-lambda'
import typeDefs from '../../app-graphql/src/schema.graphql'
import {resolvers} from '../handlers/apollo_gql'

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

const constructTestServer = ({ context = defaultContext } = {}): ApolloServer => new ApolloServer({
        typeDefs,
        resolvers,
        playground: {
            endpoint: '/local/graphql',
        },
        context
    })




  export {constructTestServer}
