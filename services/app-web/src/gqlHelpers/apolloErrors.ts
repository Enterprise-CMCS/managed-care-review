import { ServerError } from '@apollo/client'
import { ApolloError, GraphQLErrors, NetworkError } from '@apollo/client/errors'
import { recordJSException } from '../otelHelpers'

const handleNetworkError = (
    networkError: NetworkError,
    isAuthenticated: boolean
) => {
    if (networkError?.name === 'ServerError') {
        const serverError = networkError as ServerError
        if (serverError.statusCode === 403 && !isAuthenticated) {
            // Do nothing, this is an expected 403 for a logged out user trying to load a page where we query auth
            return
        } else if (serverError.statusCode === 403 && isAuthenticated) {
            // Something has caused the user to lose their session outside the scope of MC-Review.
            // Log this so we have a record of it, but not entirely unexpected if user is opening application in multiple and only logging out of one of them.
            recordJSException(
                `[User auth error]: Code: ${serverError.statusCode} Message: ${serverError.message}`
            )
        } else {
            // Server could be down. Log this.
            recordJSException(
                `[Server error]: Code: ${serverError.statusCode} Message: ${serverError.message}`
            )
        }
    } else {
        recordJSException(`[Network error]: ${networkError}`)
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
export { handleApolloError }
