import { MockedResponse } from "@apollo/client/testing";
import { 
  FetchOauthClientsDocument,
  FetchOauthClientsQuery
} from "../gen/gqlClient";
import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";

const fetchOauthClientsMockSuccess = (): MockedResponse<FetchOauthClientsQuery> => {
  return {
    request: {
      query: FetchOauthClientsDocument,
      variables: {}
    },
    result: {
      data: {
        fetchOauthClients: {
          __typename: 'FetchOauthClientsPayload' as const,
          oauthClients: [
            {
              id: "id-123",
              clientId: "oauth-client-123",
              clientSecret: "client-key-123", //pragma: allowlist secret
              grants: [
                  "client_credentials",
                  "refresh_token"
              ],
              description: "description placeholder test",
              user: {
                  id: "user5",
                  email: "roku@example.com",
                  givenName: "Roku",
                  familyName: "Hotman",
                  role: "CMS_USER",
                  stateAssignments: [],
                  __typename: "CMSUser"
              },
              createdAt: "2025-06-25T22:56:09.407Z",
              updatedAt: "2025-06-25T22:56:09.407Z",
              __typename: "OauthClient"
          }
          ]
        }
      }
    }
  }
}

const fetchOauthClientsMockFail = (): MockedResponse<ApolloError> => {
  const graphQLError = new GraphQLError(
    'Error fetching Oauth clients.',
    {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        CAUSE: 'DB_ERROR',
      },
    }
  )
  return {
    request: {
      query: FetchOauthClientsDocument,
      variables: {},
    },
    error: new ApolloError ({
      graphQLErrors: [graphQLError],
    }),
    result: {
      data: null
    },
  }
}

export {fetchOauthClientsMockSuccess, fetchOauthClientsMockFail}
