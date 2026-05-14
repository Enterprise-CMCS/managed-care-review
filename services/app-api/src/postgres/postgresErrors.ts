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
 * @param error - The UserInputPostgresError to convert
 * @param argumentName - The name of the invalid argument
 * @param argumentValues - The actual invalid values (optional)
 */
export const handleUserInputPostgresError = (
    error: UserInputPostgresError,
    argumentName?: string,
    argumentValues?: unknown
): GraphQLError => {
    const extensions: Record<string, unknown> = {
        code: 'BAD_USER_INPUT',
        cause: 'BAD_USER_INPUT',
    }

    if (argumentName) {
        extensions.argumentName = argumentName
    }

    if (argumentValues !== undefined) {
        extensions.argumentValues = argumentValues
    }

    return new GraphQLError(error.message, {
        extensions,
    })
}

/**
 * Prisma transaction write conflicts can surface as `P2034` from the standard
 * engine or as a driver-adapter error whose `cause.kind` is
 * `TransactionWriteConflict`.
 */
export const isRetryablePrismaWriteConflict = (error: unknown): boolean => {
    const code = (error as { code?: string }).code
    const cause = (error as { cause?: { kind?: string } }).cause

    return code === 'P2034' || cause?.kind === 'TransactionWriteConflict'
}

export { NotFoundError, UserInputPostgresError }
