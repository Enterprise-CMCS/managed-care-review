import { MockLink } from '@apollo/client/testing'
import {
    FetchOauthClientsDocument,
    FetchOauthClientsQuery,
    CreateOauthClientDocument,
    CreateOauthClientInput,
    CreateOauthClientMutation,
    OAuthUser,
} from '../gen/gqlClient'
import { GraphQLError } from 'graphql'
import { v4 as uuidv4 } from 'uuid'

const fetchOauthClientsMockSuccess =
    (): MockLink.MockedResponse<FetchOauthClientsQuery> => {
        return {
            request: {
                query: FetchOauthClientsDocument,
                variables: {},
            },
            result: {
                data: {
                    fetchOauthClients: {
                        __typename: 'FetchOauthClientsPayload' as const,
                        oauthClients: [
                            {
                                id: 'id-123',
                                clientId: 'oauth-client-123',
                                clientSecret: 'client-key-123', //pragma: allowlist secret
                                grants: ['client_credentials', 'refresh_token'],
                                scopes: ['CMS_SUBMISSION_ACTIONS'],
                                description: 'description placeholder test',
                                user: {
                                    id: 'user5',
                                    email: 'roku@example.com',
                                    givenName: 'Roku',
                                    familyName: 'Hotman',
                                    role: 'CMS_USER',
                                    stateAssignments: [],
                                    __typename: 'CMSUser',
                                },
                                createdAt: '2025-06-25T22:56:09.407Z',
                                updatedAt: '2025-06-25T22:56:09.407Z',
                                __typename: 'OauthClient',
                            },
                        ],
                    },
                },
            },
        }
    }

const fetchOauthClientsMockFail =
    (): MockLink.MockedResponse<FetchOauthClientsQuery> => {
    const graphQLError = new GraphQLError('Error fetching Oauth clients.', {
        extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            CAUSE: 'DB_ERROR',
        },
    })
    return {
        request: {
            query: FetchOauthClientsDocument,
            variables: {},
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const createOauthClientMockSuccess = ({
    input,
    user,
}: {
    input: CreateOauthClientInput
    user: OAuthUser
}): MockLink.MockedResponse<CreateOauthClientMutation> => {
    return {
        request: {
            query: CreateOauthClientDocument,
            variables: {
                input,
            },
        },
        result: {
            data: {
                createOauthClient: {
                    __typename: 'CreateOauthClientPayload',
                    oauthClient: {
                        __typename: 'OauthClient',
                        id: uuidv4(),
                        clientId: `oauth-client-${uuidv4()}`,
                        clientSecret: `shhhhsecret`, //pragma: allowlist secret
                        grants: ['client_credentials'],
                        scopes: input.scopes ?? [],
                        description: input.description ?? null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        user: user,
                    },
                },
            },
        },
    }
}

const createOauthClientMockFailure = (
    input: CreateOauthClientInput = {
        userID: 'not-a-real-id',
        grants: [],
        description: undefined,
        scopes: [],
    }
): MockLink.MockedResponse<CreateOauthClientMutation> => {
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
                input,
            },
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

export {
    fetchOauthClientsMockSuccess,
    fetchOauthClientsMockFail,
    createOauthClientMockSuccess,
    createOauthClientMockFailure,
}
