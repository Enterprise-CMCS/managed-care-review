import { ServerError } from '@apollo/client'
import { NetworkError } from '@apollo/client/errors'
import { GraphQLError } from 'graphql'
import { recordJSException } from '@mc-review/otel'

/*
Adds OTEL logging for GraphQL API errors
- Reminder, we handle GraphQL requests via Apollo Client in our web app.
- Now uses standard GraphQLError from graphql package instead of Apollo-specific types
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

const handleGQLErrors = (graphQLErrors: readonly GraphQLError[]) => {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        recordJSException(
            // GraphQL errors mean something is wrong inside our api, maybe bad request or errors we return from api for known edge cases
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}, Code: ${extensions?.code || 'UNKNOWN'}`
        )
    })
}

// Generic error type that can handle both Apollo Client errors and individual GraphQL errors
type GraphQLErrorInput = 
    | GraphQLError 
    | { graphQLErrors?: readonly GraphQLError[]; networkError?: NetworkError | Error }
    | Error

const handleGraphQLError = (error: GraphQLErrorInput, isAuthenticated: boolean) => {
    // Handle individual GraphQLError
    if (error instanceof GraphQLError) {
        handleGQLErrors([error])
        return
    }
    
    // Handle Apollo Client-style error structure
    if (typeof error === 'object' && error !== null && ('graphQLErrors' in error || 'networkError' in error)) {
        const apolloStyleError = error as { graphQLErrors?: readonly GraphQLError[]; networkError?: NetworkError | Error }
        if (apolloStyleError.graphQLErrors) handleGQLErrors(apolloStyleError.graphQLErrors)
        if (apolloStyleError.networkError) handleNetworkError(apolloStyleError.networkError as NetworkError, isAuthenticated)
        return
    }
    
    // Handle generic Error
    if (error instanceof Error) {
        handleNetworkError(error as NetworkError, isAuthenticated)
    }
}

// User auth errors are not necessarily worth logging.
// For example, they are expected when an IDM session times out while user was in the application but inactive
const isLikelyUserAuthError = (
    error: GraphQLErrorInput,
    isAuthenticated: boolean
) => {
    // Handle Apollo Client-style error structure
    if (typeof error === 'object' && error !== null && 'networkError' in error) {
        const apolloStyleError = error as { networkError?: NetworkError | Error }
        const networkError = apolloStyleError.networkError
        if (networkError?.name === 'ServerError') {
            const serverError = networkError as ServerError
            return serverError.statusCode === 403 && isAuthenticated
        }
    }
    
    // Handle direct network error
    if (error instanceof Error && error.name === 'ServerError') {
        const serverError = error as ServerError
        return serverError.statusCode === 403 && isAuthenticated
    }
    
    return false
}

// Legacy alias for backward compatibility
const handleApolloError = handleGraphQLError

export { handleGraphQLError, handleApolloError, isLikelyUserAuthError, handleGQLErrors }
export type { GraphQLErrorInput }
