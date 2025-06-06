import { gql } from '@apollo/client'

export const UpdateOauthClientDocument = gql`
    mutation UpdateOauthClient($input: UpdateOauthClientInput!) {
        updateOauthClient(input: $input) {
            oauthClient {
                id
                clientId
                description
                contactEmail
                grants
            }
        }
    }
` 