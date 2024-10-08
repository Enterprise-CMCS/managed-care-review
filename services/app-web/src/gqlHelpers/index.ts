import { GraphQLErrors } from '@apollo/client/errors'
import {
    getCurrentRevisionFromHealthPlanPackage,
    getLastSubmittedRevision,
} from './healthPlanPackages'
import {
    unlockMutationWrapper,
    submitMutationWrapper,
} from './mutationWrappersForUserFriendlyErrors'
import {
    useFetchHealthPlanPackageWrapper,
    useFetchHealthPlanPackageWithQuestionsWrapper,
} from './fetchHealthPlanPackageWrapper'
import { hasCMSUserPermissions, hasAdminUserPermissions, getUpdatedByDisplayName } from './userHelpers'
import { updateDivisionAssignment } from './updateDivisionAssignment'

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
    getLastSubmittedRevision,
    useFetchHealthPlanPackageWrapper,
    unlockMutationWrapper,
    submitMutationWrapper,
    useFetchHealthPlanPackageWithQuestionsWrapper,
    hasCMSUserPermissions,
    hasAdminUserPermissions,
    getUpdatedByDisplayName,
    updateDivisionAssignment
}
