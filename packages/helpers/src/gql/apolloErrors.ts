import { ServerError } from '@apollo/client'
import { ApolloError, GraphQLErrors, NetworkError } from '@apollo/client/errors'
import { recordJSException } from '@mc-review/otel'

/*
Adds OTEL logging for graphql api errors
- Reminder, we handle graphql requests via apollo client in our web app.
*/

const handleNetworkError = (
    networkError: NetworkError,
    isAuthenticated: boolean
) => {
    if (networkError?.name === 'ServerError') {
        const serverError = networkError as ServerError
        if (serverError.statusCode === 403 && !isAuthenticated) {
            // Log nothing, this is an expected 403 for a logged out user trying to load a page where we query auth
            return
        } else if (serverError.statusCode === 403 && isAuthenticated) {
            // Something has caused the user to lose their session entirely outside the scope of MC-Review.
            // Log this so we have a record of it, but not entirely unexpected if user is opening application in multiple tabs and only logging out of one of them.
            recordJSException(
                `[User auth error]: Code: ${serverError.statusCode} Message: ${serverError.message} ${serverError.stack}`
            )
        } else {
            // Server could be down. Log this.
            recordJSException(
                `[Server error]: Code: ${serverError.statusCode} Message: ${serverError.message} ${serverError.stack}`
            )
        }
    } else {
        // Unknown general network issue
        recordJSException(
            `[Network issue]: ${networkError?.message} ${networkError?.stack}`
        )
    }
}

const handleGQLErrors = (graphQLErrors: GraphQLErrors) => {
    graphQLErrors.forEach(({ message, locations, path }) => {
        recordJSException(
            // Graphql errors mean something is wrong inside our api, maybe bad request or errors we return from api for known edge cases
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        )
    })
}

const handleApolloError = (error: ApolloError, isAuthenticated: boolean) => {
    const { graphQLErrors, networkError } = error
    if (graphQLErrors) handleGQLErrors(graphQLErrors)
    if (networkError) handleNetworkError(networkError, isAuthenticated)
}

// User auth errors are not necessarily worth logging.
// For example, they are expected when an IDM session times out while user was in the application but inactive
const isLikelyUserAuthError = (
    error: ApolloError,
    isAuthenticated: boolean
) => {
    const { networkError } = error
    if (networkError?.name === 'ServerError') {
        const serverError = networkError as ServerError
        return serverError.statusCode === 403 && isAuthenticated
    } else {
        return false
    }
}
export { handleApolloError, isLikelyUserAuthError, handleGQLErrors }
