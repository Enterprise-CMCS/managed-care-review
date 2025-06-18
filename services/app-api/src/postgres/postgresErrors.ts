import { GraphQLError } from 'graphql'

// NotFoundError is an Error subclass that indicates that we failed to find the request record in the db
class NotFoundError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, NotFoundError.prototype)
    }
}

// UserInputPostgresError is an Error subclass that indicates that the user passed in invalid arguements
// maps to BAD_USER_INPUT in GraphQLError
class UserInputPostgresError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, UserInputPostgresError.prototype)
    }
}

/**
 * Converts NotFoundError to GraphQLError with appropriate extensions
 */
export const handleNotFoundError = (error: NotFoundError): GraphQLError => {
    return new GraphQLError(error.message, {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })
}

/**
 * Converts UserInputPostgresError to GraphQLError with appropriate extensions
 */
export const handleUserInputPostgresError = (
    error: UserInputPostgresError,
    argumentName?: string
): GraphQLError => {
    return new GraphQLError(error.message, {
        extensions: {
            code: 'BAD_USER_INPUT',
            argumentName,
            cause: 'BAD_USER_INPUT',
        },
    })
}

export { NotFoundError, UserInputPostgresError }
