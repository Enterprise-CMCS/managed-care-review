import type { UploadBucketName } from '../gen/gqlClient'

export type StorageSmokeStep =
    | 'authentication'
    | 'fixture'
    | 'current-user'
    | 'generate-upload'
    | 'put'
    | 'scan'
    | 'download-url'
    | 'get'
    | 'checksum'

const errorNames = new Set([
    'Error',
    'TypeError',
    'AbortError',
    'TimeoutError',
    'AssertionError',
    'CombinedGraphQLErrors',
    'ServerError',
    'ServerParseError',
    'NotAuthorizedException',
    'AccessDeniedException',
    'InvalidParameterException',
    'ResourceNotFoundException',
    'CredentialsProviderError',
])
const graphQLCodes = new Set([
    'FORBIDDEN',
    'UNAUTHENTICATED',
    'BAD_USER_INPUT',
    'INTERNAL_SERVER_ERROR',
    'GRAPHQL_VALIDATION_FAILED',
    'GRAPHQL_PARSE_FAILED',
    'NOT_FOUND',
])

/** Preserve useful failure location without copying bearer URLs or raw SDK errors. */
export function storageSmokeFailure(
    bucket: UploadBucketName,
    infected: boolean,
    step: StorageSmokeStep,
    error: unknown,
    responseStatus?: number
): Error {
    const failure =
        error && typeof error === 'object'
            ? (error as {
                  name?: unknown
                  statusCode?: unknown
                  errors?: unknown
              })
            : {}
    const kind =
        typeof failure.name === 'string' && errorNames.has(failure.name)
            ? failure.name
            : 'unclassified error'
    const status = responseStatus ?? failure.statusCode
    const http =
        typeof status === 'number' &&
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
            ? `; HTTP ${status}`
            : ''
    const codes = Array.isArray(failure.errors)
        ? failure.errors.flatMap((entry: unknown) => {
              const code = (entry as { extensions?: { code?: unknown } } | null)
                  ?.extensions?.code
              return typeof code === 'string' && graphQLCodes.has(code)
                  ? [code]
                  : []
          })
        : []
    const graphql = codes.length
        ? `; GraphQL ${[...new Set(codes)].join(',')}`
        : ''
    // No raw message, stack or cause: they can contain request URLs and credentials.
    return new Error(
        `API storage ${infected ? 'malware' : 'clean'} smoke failed for ${bucket} at ${step} (${kind}${http}${graphql}); inspect approved server-side diagnostics`
    )
}
