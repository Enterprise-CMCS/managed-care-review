import type { GraphQLFormattedError } from 'graphql'
import { extractGraphQLResponse } from './gqlHelpers'
import type { TestGraphQLResponse } from './apolloV4ResponseHelper'

// assertAnError returns an the only error in a graphQL errors response
function assertAnError(res: TestGraphQLResponse): GraphQLFormattedError {
    // Extract the actual GraphQL response from v4 structure if needed
    const graphqlResponse = extractGraphQLResponse(res)

    if (!graphqlResponse.errors || graphqlResponse.errors.length === 0) {
        throw new Error('response did not return errors')
    }

    if (graphqlResponse.errors.length > 1) {
        console.error('Got Multiple Errors: ', graphqlResponse.errors)
        throw new Error('response returned multiple errors')
    }

    return graphqlResponse.errors[0]
}

// assertAnErrorExtensions returns the error code from the only error's extensions
function assertAnErrorExtensions(
    res: TestGraphQLResponse
): Record<string, unknown> {
    const err = assertAnError(res)

    if (!err.extensions) {
        console.error('Got no extensions', err)
        throw new Error('error returned had no extensions')
    }

    return err.extensions
}

// assertAnErrorCode returns the error code from the only error's extensions
function assertAnErrorCode(res: TestGraphQLResponse): string {
    const extensions = assertAnErrorExtensions(res)

    if (!extensions.code || !(typeof extensions.code === 'string')) {
        console.error('Got no code extension', assertAnError(res))
        throw new Error('error returned had no code')
    }

    return extensions.code
}

export { assertAnError, assertAnErrorExtensions, assertAnErrorCode }
