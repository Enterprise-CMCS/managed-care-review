export const GRAPHQL_ERROR_ARGUMENT_MESSAGES = {
    EMAIL_ERROR: 'Error attempting to send emails.',
    INVALID_PACKAGE_STATUS:
        'Attempted to submit or unlock package with wrong status',
}

type GraphQLErrorCodeTypes =
    | 'BAD_USER_INPUT'
    | 'FORBIDDEN'
    | 'INTERNAL_SERVER_ERROR'
    | 'INVALID_PACKAGE_STATUS'

type GraphQLErrorArgumentNameTypes =
    keyof typeof GRAPHQL_ERROR_ARGUMENT_MESSAGES

export type { GraphQLErrorCodeTypes, GraphQLErrorArgumentNameTypes }
