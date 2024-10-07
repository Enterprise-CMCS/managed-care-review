export const S3ErrorCodes = ['NETWORK_ERROR'] as const
type S3ErrorCode = (typeof S3ErrorCodes)[number] // iterable union type

export type S3Error = {
    code: S3ErrorCode
    message: string
}

// Wow this seems complicated. If there are cleaner ways to do this I'd like to know it.
export function isS3Error(err: unknown): err is S3Error {
    if (err && typeof err == 'object') {
        if ('code' in err && 'message' in err) {
            // This seems ugly but neccessary in a type guard.
            const hasCode = err as { code: unknown }
            if (typeof hasCode.code === 'string') {
                if (S3ErrorCodes.some((errCode) => hasCode.code === errCode)) {
                    return true
                }
            }
        }
    }
    return false
}
