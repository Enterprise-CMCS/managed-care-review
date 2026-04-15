import {
    CombinedGraphQLErrors,
    CombinedProtocolErrors,
    ServerError,
    ServerParseError,
} from '@apollo/client/errors'
import type { ErrorLike } from '@apollo/client'
import type { GraphQLFormattedError } from 'graphql'
import { recordJSException } from '@mc-review/otel'

/*
Adds OTEL logging for graphql api errors
- Reminder, we handle graphql requests via apollo client in our web app.
*/

const handleNetworkError = (
    networkError: Error,
    isAuthenticated: boolean
) => {
    if (ServerError.is(networkError)) {
        if (networkError.statusCode === 403 && !isAuthenticated) {
            // Log nothing, this is an expected 403 for a logged out user trying to load a page where we query auth
            return
        } else if (networkError.statusCode === 403 && isAuthenticated) {
            // Something has caused the user to lose their session entirely outside the scope of MC-Review.
            // Log this so we have a record of it, but not entirely unexpected if user is opening application in multiple tabs and only logging out of one of them.
            recordJSException(
                `[User auth error]: Code: ${networkError.statusCode} Message: ${networkError.message} ${networkError.stack}`
            )
        } else {
            // Server could be down. Log this.
            recordJSException(
                `[Server error]: Code: ${networkError.statusCode} Message: ${networkError.message} ${networkError.stack}`
            )
        }
    } else if (ServerParseError.is(networkError)) {
        recordJSException(
            `[Server parse error]: Code: ${networkError.statusCode} Message: ${networkError.message} ${networkError.stack}`
        )
    } else {
        // Unknown general network issue
        recordJSException(
            `[Network issue]: ${networkError?.message} ${networkError?.stack}`
        )
    }
}

const handleGQLErrors = (
    graphQLErrors: ReadonlyArray<GraphQLFormattedError>
) => {
    graphQLErrors.forEach(({ message, locations, path }) => {
        recordJSException(
            // Graphql errors mean something is wrong inside our api, maybe bad request or errors we return from api for known edge cases
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        )
    })
}

const handleApolloError = (
    error: ErrorLike | Error,
    isAuthenticated: boolean
) => {
    if (CombinedGraphQLErrors.is(error)) {
        handleGQLErrors(error.errors)
    } else if (CombinedProtocolErrors.is(error)) {
        error.errors.forEach(({ message }) =>
            recordJSException(`[GraphQL protocol error]: Message: ${message}`)
        )
    } else if (error instanceof Error) {
        handleNetworkError(error, isAuthenticated)
    }
}

// User auth errors are not necessarily worth logging.
// For example, they are expected when an IDM session times out while user was in the application but inactive
const isLikelyUserAuthError = (
    error: ErrorLike | Error,
    isAuthenticated: boolean
) => {
    if (ServerError.is(error)) {
        return error.statusCode === 403 && isAuthenticated
    }
    return false
}
export { handleApolloError, isLikelyUserAuthError, handleGQLErrors }
