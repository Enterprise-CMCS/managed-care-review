import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
} from '@prisma/client/runtime/library'

const StoreErrorCodes = [
    'CONFIGURATION_ERROR',
    'CONNECTION_ERROR',
    'PROTOBUF_ERROR',
    'INSERT_ERROR',
    'USER_FORMAT_ERROR',
    'UNEXPECTED_EXCEPTION',
    'WRONG_STATUS',
    'NOT_FOUND_ERROR',
] as const
type StoreErrorCode = (typeof StoreErrorCodes)[number] // iterable union type

type StoreError = {
    code: StoreErrorCode
    message: string
}

// Wow this seems complicated. If there are cleaner ways to do this I'd like to know it.
function isStoreError(err: unknown): err is StoreError {
    if (err && typeof err == 'object') {
        if ('code' in err && 'message' in err) {
            // This seems ugly but necessary in a type guard.
            const hasCode = err as { code: unknown }
            if (typeof hasCode.code === 'string') {
                if (
                    StoreErrorCodes.some((errCode) => hasCode.code === errCode)
                ) {
                    return true
                }
            }
        }
    }
    return false
}

// This function is meant to be called from a catch statement after trying
// a prisma command, so it takes unknown as the input
const convertPrismaErrorToStoreError = (prismaErr: unknown): StoreError => {
    // PrismaClientKnownRequestError is for errors that are expected to occur based on
    // making invalid requests of some kind.
    if (prismaErr instanceof PrismaClientKnownRequestError) {
        // P2002 is for violating a uniqueness constraint
        if (prismaErr.code === 'P2002') {
            return {
                code: 'INSERT_ERROR',
                message: 'insert failed because of invalid unique constraint',
            }
        }

        // An operation failed because it depends on one or more records
        // that were required but not found.
        if (prismaErr.code === 'P2025') {
            return {
                code: 'NOT_FOUND_ERROR',
                message:
                    'An operation failed because it depends on one or more records that were required but not found.',
            }
        }

        console.error(
            'ERROR: Unhandled KnownRequestError from prisma: ',
            prismaErr
        )
        return {
            code: 'UNEXPECTED_EXCEPTION',
            message: 'An unexpected prisma exception has occurred',
        }
    }

    // PrismaClientInitializationError is for errors trying to setup a prisma connection
    if (prismaErr instanceof PrismaClientInitializationError) {
        return {
            code: 'CONNECTION_ERROR',
            message: prismaErr.message,
        }
    }

    console.error(
        "CODING ERROR: we weren't able to decode the error thrown by prisma correctly",
        prismaErr
    )
    return {
        code: 'UNEXPECTED_EXCEPTION',
        message: 'A completely unexpected prisma exception has occurred',
    }
}

class NotFoundError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, NotFoundError.prototype)
    }
}

export type { StoreError }
export { NotFoundError, isStoreError, convertPrismaErrorToStoreError }
