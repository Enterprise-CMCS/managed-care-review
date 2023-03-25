export const GRAPHQL_ERROR_MOCK_MESSAGES = {
    EMAIL_ERROR: 'Error attempting to send emails.',
    BAD_USER_INPUT: 'An error occurred due to bad user input.',
    FORBIDDEN: "You don't have permission to access the requested resource.",
}

export type GraphQLErrorMockCodeType = keyof typeof GRAPHQL_ERROR_MOCK_MESSAGES
