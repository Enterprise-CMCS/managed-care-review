export const GRAPHQL_ERROR_ARGUMENT_MESSAGES = {
    EMAIL_ERROR: 'Error attempting to send emails.',
}

type GraphQLErrorCodeTypes =
    | 'BAD_USER_INPUT'
    | 'FORBIDDEN'
    | 'INTERNAL_SERVER_ERROR'

type GraphQLErrorArgumentNameTypes =
    keyof typeof GRAPHQL_ERROR_ARGUMENT_MESSAGES

export type { GraphQLErrorCodeTypes, GraphQLErrorArgumentNameTypes }
