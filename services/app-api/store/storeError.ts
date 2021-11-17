export const StoreErrorCodes = [
    'CONFIGURATION_ERROR',
    'CONNECTION_ERROR',
    'PROTOBUF_ERROR',
    'INSERT_ERROR',
    'UNEXPECTED_EXCEPTION',
    'WRONG_STATUS',
] as const
type StoreErrorCode = typeof StoreErrorCodes[number] // iterable union type

export type StoreError = {
    code: StoreErrorCode
    message: string
}

// Wow this seems complicated. If there are cleaner ways to do this I'd like to know it.
export function isStoreError(err: unknown): err is StoreError {
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

export const convertDynamoErrorToStoreError = (
    dynamoCode: string
): StoreError => {
    switch (dynamoCode) {
        case 'UnknownEndpoint' || 'NetworkingError':
            return {
                code: 'CONNECTION_ERROR',
                message:
                    'Failed to connect to the database when trying to insert a new State Submission',
            }
        case 'ResourceNotFoundException':
            return {
                code: 'CONFIGURATION_ERROR',
                message: 'Table does not exist',
            }
        default:
            console.log(
                'Check this code, we may not be handling it',
                dynamoCode
            )
            return {
                code: 'UNEXPECTED_EXCEPTION',
                message: 'An expected exception has occurred',
            }
    }
}
