import { GraphQLError } from 'graphql'

/**
 * Creates a GraphQLError with FORBIDDEN code for authorization failures
 */
export function createForbiddenError(message: string): GraphQLError {
    return new GraphQLError(message, {
        extensions: { code: 'FORBIDDEN' },
    })
}

/**
 * Creates a GraphQLError with BAD_USER_INPUT code for form validation errors
 */
export function createUserInputError(
    message: string,
    argumentName?: string
): GraphQLError {
    const extensions: Record<string, unknown> = { code: 'BAD_USER_INPUT' }
    if (argumentName) {
        extensions.argumentName = argumentName
    }
    return new GraphQLError(message, {
        extensions,
    })
}

/**
 * Creates a GraphQLError with NOT_FOUND code for missing resource errors
 */
export function createNotFoundError(message: string): GraphQLError {
    return new GraphQLError(message, {
        extensions: { code: 'NOT_FOUND' },
    })
}

/**
 * Creates a GraphQLError with INTERNAL_SERVER_ERROR code for server errors
 */
export function createInternalServerError(
    message: string,
    cause?: string
): GraphQLError {
    const extensions: Record<string, unknown> = {
        code: 'INTERNAL_SERVER_ERROR',
    }
    if (cause) {
        extensions.cause = cause
    }
    return new GraphQLError(message, {
        extensions,
    })
}

/**
 * Creates a GraphQLError with UNAUTHENTICATED code for authentication errors
 */
export function createAuthenticationError(message: string): GraphQLError {
    return new GraphQLError(message, {
        extensions: { code: 'UNAUTHENTICATED' },
    })
}
