import type { GraphQLFormattedError } from 'graphql'

type GraphQLErrors = ReadonlyArray<GraphQLFormattedError>

export type { GraphQLErrors }

export const isGraphQLErrors = (input: unknown): input is GraphQLErrors => {
    if (Array.isArray(input)) {
        return input.every((i) => {
            return 'extensions' in i && 'message' in i && 'path' in i
        })
    }
    return false
}

export * from './apolloErrors'
export * from './apolloQueryWrapper'
export * from './graphQLErrorAccessors'
export * from './mutationWrappersForUserFriendlyErrors'
export * from './updateCMSUser'
export * from './userHelpers'
