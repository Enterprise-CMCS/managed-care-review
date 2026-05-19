import type { Context } from '../handlers/apollo_gql'

function logSuccess(operation: string) {
    console.info({
        message: `${operation} succeeded`,
        operation: operation,
        status: 'SUCCESS',
    })
}

function logError(operation: string, error: Error | string) {
    console.error({
        message: `${operation} failed`,
        operation: operation,
        status: 'ERROR',
        error: error,
    })
}

/**
 * Logs a resolver failure with structured request metadata from the GraphQL context.
 *
 * Use this in GraphQL resolvers when caller details should be attached to the log entry.
 * For non-resolver code, use `logError()` instead.
 *
 * @param operation - Resolver or operation name associated with the failure.
 * @param error - Error object or message to include in the log payload.
 * @param context - Resolver context containing the authenticated user and OAuth client, if present.
 */
function logResolverError(
    operation: string,
    error: Error | string,
    context: Pick<Context, 'user' | 'oauthClient'>
) {
    console.error({
        message: `${operation} failed`,
        operation: operation,
        status: 'ERROR',
        error: error,
        requestContext: {
            userId: context.user?.id,
            role: context.user?.role,
            oauthClient: context.oauthClient,
        },
    })
}

export { logSuccess, logError, logResolverError }
