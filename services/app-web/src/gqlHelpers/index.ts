import { GraphQLErrors } from '@apollo/client/errors'
import { DraftSubmission, StateSubmission } from '../gen/gqlClient'
import {
    getCurrentRevisionFromSubmission2,
    isGQLDraftSubmission,
    convertDomainModelFormDataToGQLSubmission,
} from './submissionWithRevisions'
const isStateSubmission = (
    submission: DraftSubmission | StateSubmission
): submission is StateSubmission => {
    if (submission.__typename === 'StateSubmission') {
        return true
    } else return false
}

const isGraphQLErrors = (
    input: unknown 
): input is GraphQLErrors => {
    if (Array.isArray(input)) {
        return input.every(i => {
            return 'extensions' in i && 'message' in i && 'path' in i
        })
    }
    return false
}

export {convertDomainModelFormDataToGQLSubmission,  getCurrentRevisionFromSubmission2, isStateSubmission, isGraphQLErrors, isGQLDraftSubmission }
