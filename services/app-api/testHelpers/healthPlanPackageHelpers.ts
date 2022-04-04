import { SubmissionUnionType } from '../../app-web/src/common-code/domain-models'
import { base64ToDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import { Submission2 } from '../gen/gqlServer'
// returns the latest form data for this submission, will throw an error if unwrapping fails
// hence, this function is meant for making clean tests, not for business logic.
export function latestFormData(pkg: Submission2): SubmissionUnionType {
    const latestRevision = pkg.revisions[0].revision
    if (!latestRevision) {
        throw new Error('no revisions found for package' + pkg.id)
    }

    const unwrapResult = base64ToDomain(latestRevision.submissionData)
    if (unwrapResult instanceof Error) {
        throw unwrapResult
    }

    return unwrapResult
}
