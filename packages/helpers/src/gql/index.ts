import { GraphQLErrors } from '@apollo/client/errors'

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
export * from './contractsAndRates'
export * from './fetchHealthPlanPackageWrapper'
export * from './healthPlanPackages'
export * from './mutationWrappersForUserFriendlyErrors'
export * from './updateCMSUser'
export * from './useIndexQuestionsQueryWrapper'
export * from './userHelpers'
