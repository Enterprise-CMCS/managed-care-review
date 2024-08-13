import { ServerError } from '@apollo/client'
import { ApolloError, GraphQLErrors, NetworkError } from '@apollo/client/errors'
import { recordJSException } from '../otelHelpers'

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
            recordJSException(serverError, {
                'error.context': 'UserAuthError',
                'user.isAuthenticated': String(isAuthenticated),
            })
        } else {
            recordJSException(serverError, {
                'error.context': 'ServerError',
                'user.isAuthenticated': String(isAuthenticated),
            })
        }
    } else {
        recordJSException(networkError, {
            'error.context': 'NetworkIssue',
            'user.isAuthenticated': String(isAuthenticated),
        })
    }
}

const handleGQLErrors = (graphQLErrors: GraphQLErrors) => {
    graphQLErrors.forEach((error) => {
        recordJSException(error, {
            'error.context': 'GraphQLError',
        })
    })
}

const handleApolloError = async (
    error: ApolloError,
    isAuthenticated: boolean
) => {
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
