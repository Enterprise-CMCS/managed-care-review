import { GraphQLErrors } from '@apollo/client/errors'
import { getCurrentRevisionFromHealthPlanPackage } from './healthPlanPackages'
import {
    unlockMutationWrapper,
    submitMutationWrapper,
} from './mutationWrappersForUserFriendlyErrors'

const isGraphQLErrors = (input: unknown): input is GraphQLErrors => {
    if (Array.isArray(input)) {
        return input.every((i) => {
            return 'extensions' in i && 'message' in i && 'path' in i
        })
    }
    return false
}

export {
    getCurrentRevisionFromHealthPlanPackage,
    isGraphQLErrors,
    unlockMutationWrapper,
    submitMutationWrapper,
}
