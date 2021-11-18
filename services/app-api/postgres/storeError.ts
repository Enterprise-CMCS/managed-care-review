import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
} from '@prisma/client/runtime'
import type { StoreError } from '../store'

// This function is meant to be called from a catch statement after trying
// a prisma command, so it takes unknown as the input
export const convertPrismaErrorToStoreError = (
    prismaErr: unknown
): StoreError => {
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

        if (prismaErr.code === 'P2025') {
            return {
                code: 'INSERT_ERROR',
                message: 'insert failed because required record not found',
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
