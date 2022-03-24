import { StateSubmission, StateSubmissionRevision } from '@prisma/client'
import { Submission2Type, UpdateInfoType } from '../../app-web/src/common-code/domain-models'
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

    // run through the list of revisions, get the newest one. 
    // If we ORDERED BY before getting these, we could probably simplify this.
    const newestRev = submissionResult.revisions.reduce((acc, revision) => {
        if (revision.createdAt > acc.createdAt) {
            return revision
        } else {
            return acc
        }
    }, submissionResult.revisions[0])

    return newestRev
}


// convertToSubmission2Type transforms the DB representation of StateSubmissionWithRevisions into our Submission2Type
function convertToSubmission2Type(dbSub: StateSubmissionWithRevisions): Submission2Type {
    return {
        id: dbSub.id,
        stateCode: dbSub.stateCode,
        revisions: dbSub.revisions.map(r => { 
            let submitInfo: UpdateInfoType | undefined = undefined
            if (r.submittedAt && r.submittedReason && r.submittedBy) {
                submitInfo = {
                    updatedAt: r.submittedAt,
                    updatedReason: r.submittedReason,
                    updatedBy: r.submittedBy
                }
            }

            let unlockInfo: UpdateInfoType | undefined = undefined
            if (r.unlockedAt && r.unlockedBy && r.unlockedReason) {
                unlockInfo = {
                    updatedAt: r.unlockedAt,
                    updatedBy: r.unlockedBy,
                    updatedReason: r.unlockedReason,
                }
            }

            return {
                id: r.id,
                unlockInfo,
                submitInfo,
                createdAt: r.createdAt,
                submissionFormProto: r.submissionFormProto,
            }
        })
    }
}


export {
    getCurrentRevision,
    convertToSubmission2Type,
}
