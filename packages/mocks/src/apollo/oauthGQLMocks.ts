import {MockedResponse} from '@apollo/client/testing';
import {
    CmsUsersUnion,
    CreateOauthClientDocument,
    CreateOauthClientInput,
    CreateOauthClientMutation,
    OauthClient
} from '../gen/gqlClient';
import { v4 as uuidv4 } from 'uuid'
import {GraphQLError} from 'graphql/index';


const createOauthClientMockSuccess = ({
    input,
    user
}: {
    input: CreateOauthClientInput,
    user: CmsUsersUnion
}): MockedResponse<CreateOauthClientMutation> => {
    return {
        request: {
            query: CreateOauthClientDocument,
            variables: {
                input
            }
        },
        result: {
            data: {
                createOauthClient: {
                    __typename: 'CreateOauthClientPayload',
                    oauthClient: {
                        __typename: 'OauthClient',
                        id: uuidv4(),
                        clientId: `oauth-client-${uuidv4()}`,
                        clientSecret: `shhhhsecret`,
                        grants: ['client_credentials'],
                        description: input.description ?? null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        user: user
                    }
                }
            }
        }
    }
}

const createOauthClientMockFailure = (): MockedResponse<CreateOauthClientMutation> => {
    const graphQLError = new GraphQLError('Issue creating Oauth client', {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })
    return {
        request: {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    id: 'not-a-real-id',
                    grants: [],
                    description: undefined
                }
            }
        },
        result: {
            data: null,
            errors: [graphQLError]
        }
    }
}

export {
    createOauthClientMockSuccess,
    createOauthClientMockFailure
}
