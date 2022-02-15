import { StateSubmission, StateSubmissionRevision } from '@prisma/client'
import { StoreError } from './storeError'

export type StateSubmissionWithRevisions = StateSubmission & {
    revisions: StateSubmissionRevision[]
}

// Return first revision associated with a submission or return a StoreError if there is submission or revisions
// used validate prisma results have useable submission
const getCurrentRevision = (
    submissionID: string,
    submissionResult: StateSubmissionWithRevisions | null
): StateSubmissionRevision | StoreError => {
    if (!submissionResult)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No submission found for id: ${submissionID}`,
        }

    if (!submissionResult.revisions || submissionResult.revisions.length < 1)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No revisions found for submission id: ${submissionID}`,
        }

    // TODO FIGURE OUT HOW TO ENSURE PROPERLY ORDERED REVISIONS HERE
    return submissionResult.revisions[0]
}



export {
    getCurrentRevision
}
