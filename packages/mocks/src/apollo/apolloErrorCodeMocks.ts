export const GRAPHQL_ERROR_CAUSE_MESSAGES = {
    EMAIL_ERROR: 'Error attempting to send emails.',
    INVALID_PACKAGE_STATUS:
        'Attempted to submit or unlock package with wrong status',
    DB_ERROR: 'database error'
}

type GraphQLErrorCodeTypes =
    | 'BAD_USER_INPUT'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'INTERNAL_SERVER_ERROR'

type GraphQLErrorCauseTypes = keyof typeof GRAPHQL_ERROR_CAUSE_MESSAGES

export type { GraphQLErrorCodeTypes, GraphQLErrorCauseTypes }
