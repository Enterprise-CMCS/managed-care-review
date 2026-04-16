import { CombinedGraphQLErrors } from '@apollo/client/errors'
import type { ErrorLike } from '@apollo/client'
import type { GraphQLFormattedError } from 'graphql'

// Reuses the standard `GraphQLFormattedError` shape from the `graphql`
// package (`message`, `path`, `locations`) and narrows `extensions` to the
// bag MC-Review resolvers populate — `code` and `cause` come from every
// error, while `argumentName` / `argumentValues` only come from
// BAD_USER_INPUT. See services/app-api/src/resolvers/errorUtils.ts.
export type GQLError = Omit<GraphQLFormattedError, 'extensions'> & {
    extensions: {
        code: string | undefined
        cause: string | undefined
        argumentName: string | undefined
        argumentValues: unknown
    }
}

// Surfaces the first GraphQL error from Apollo's `CombinedGraphQLErrors`.
// Returns undefined for non-GraphQL errors (e.g. network errors). Only the
// first error is surfaced since callers use this to pick a single UI branch.
export const toGQLError = (
    error: ErrorLike | Error | undefined | null
): GQLError | undefined => {
    if (!error || !CombinedGraphQLErrors.is(error)) return undefined
    const first = error.errors[0]
    if (!first) return undefined
    const extensions = first.extensions
    const asString = (value: unknown): string | undefined =>
        typeof value === 'string' ? value : undefined
    return {
        ...first,
        extensions: {
            code: asString(extensions?.code),
            cause: asString(extensions?.cause),
            argumentName: asString(extensions?.argumentName),
            argumentValues: extensions?.argumentValues,
        },
    }
}
