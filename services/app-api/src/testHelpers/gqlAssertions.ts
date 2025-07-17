import type { GraphQLFormattedError } from 'graphql'

// Apollo Server v4 response type
type GraphQLResponse = {
    body: {
        data?: any
        errors?: GraphQLFormattedError[]
    }
}

// assertAnError returns an the only error in a graphQL errors response
function assertAnError(res: GraphQLResponse): GraphQLFormattedError {
    if (!res.body.errors || res.body.errors.length === 0) {
        throw new Error('response did not return errors')
    }

    if (res.body.errors.length > 1) {
        console.error('Got Multiple Errors: ', res.body.errors)
        throw new Error('response returned multiple errors')
    }

    return res.body.errors[0]
}

// assertAnErrorExtensions returns the error code from the only error's extensions
function assertAnErrorExtensions(
    res: GraphQLResponse
): Record<string, unknown> {
    const err = assertAnError(res)

    if (!err.extensions) {
        console.error('Got no extensions', err)
        throw new Error('error returned had no extensions')
    }

    return err.extensions
}

// assertAnErrorCode returns the error code from the only error's extensions
function assertAnErrorCode(res: GraphQLResponse): string {
    const extensions = assertAnErrorExtensions(res)

    if (!extensions.code || !(typeof extensions.code === 'string')) {
        console.error('Got no code extension', assertAnError(res))
        throw new Error('error returned had no code')
    }

    return extensions.code
}

export { assertAnError, assertAnErrorExtensions, assertAnErrorCode }
