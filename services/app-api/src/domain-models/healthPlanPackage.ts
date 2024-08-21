import type {
    HealthPlanRevisionType,
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
} from './HealthPlanPackageType'
import { pruneDuplicateEmails } from '../emailer/formatters'

// submissionStatus computes the current status of the submission based on
// the submit/unlock info on its revisions.
// These methods ASSUME that revisions are returned most-recent-first.
function packageStatus(
    pkg: HealthPlanPackageType
): HealthPlanPackageStatusType | Error {
    // Compute the current status of this submission based on the number of revisions.
    const currentRev = packageCurrentRevision(pkg)

    // draft - only one revision, no submission status
    // submitted - one revision with submission status
    if (pkg.revisions.length === 1) {
        if (currentRev.submitInfo) {
            return 'SUBMITTED'
        }
        return 'DRAFT'
    } else if (pkg.revisions.length > 1) {
        // unlocked - multiple revisions, latest revision has unlocked status and no submitted status
        // resubmitted - multiple revisions, latest revision has submitted status
        if (currentRev.submitInfo) {
            return 'RESUBMITTED'
        }
        return 'UNLOCKED'
    }

    return new Error(
        `No revisions on this submission with contractID: ${pkg.id}`
    )
}

// submissionSubmittedAt returns the INITIAL submission date. Even if the
// submission has been unlocked and resubmitted the submission date is always the original submit date
// This method relies on revisions always being presented in most-recent-first order
function packageSubmittedAt(pkg: HealthPlanPackageType): Date | undefined {
    const firstSubmittedRev = pkg.revisions[pkg.revisions.length - 1]
    return firstSubmittedRev?.submitInfo?.updatedAt
}

// submissionCurrentRevision returns the most recent revision
// This method (and others here!) rely on revisions always being returned in most-recent-first order
function packageCurrentRevision(
    pkg: HealthPlanPackageType
): HealthPlanRevisionType {
    return pkg.revisions[0]
}

function packageSubmitters(pkg: HealthPlanPackageType): string[] {
    const submitters: string[] = []
    pkg.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy.email)
    )

    return pruneDuplicateEmails(submitters)
}

export {
    packageCurrentRevision,
    packageStatus,
    packageSubmittedAt,
    packageSubmitters,
}
