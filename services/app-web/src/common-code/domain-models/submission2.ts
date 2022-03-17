import { RevisionType, Submission2Status, Submission2Type } from './Submission2Type'


// submissionStatus computes the current status of the submission based on 
// the submit/unlock info on its revisions.
// These methods ASSUME that revisions are returned most-recent-first.
function submissionStatus(submission: Submission2Type): Submission2Status | Error {

    // Compute the current status of this submission based on the number of revisions.
    const currentRev = submissionCurrentRevision(submission)

    // draft - only one revision, no submission status
    // submitted - one revision with submission status
    if (submission.revisions.length === 1) {
        if (currentRev.submitInfo) {
            return 'SUBMITTED'
        }
        return 'DRAFT'
    } else if (submission.revisions.length > 1) {
        // unlocked - multiple revisions, latest revision has unlocked status and no submitted status
        // resubmitted - multiple revisions, latest revision has submitted status
        if (currentRev.submitInfo) {
            return 'RESUBMITTED'
        }
        return 'UNLOCKED'
    }

    return new Error('No revisions on this submission')
}

// submissionSubmittedAt returns the INITIAL submission date. Even if the
// submission has been unlocked and resubmitted the submission date is always the original submit date 
// This method relies on revisions always being presented in most-recent-first order
function submissionSubmittedAt(submission: Submission2Type): Date | undefined {
    const lastSubmittedRev = submission.revisions[submission.revisions.length - 1]
    return lastSubmittedRev?.submitInfo?.updatedAt
}

// submissionCurrentRevision returns the most recent revision
// This method (and others here!) rely on revisions always being returned in most-recent-first order
function submissionCurrentRevision(submission: Submission2Type): RevisionType {
    return submission.revisions[0]
}

export {
    submissionCurrentRevision,
    submissionStatus,
    submissionSubmittedAt,
}
