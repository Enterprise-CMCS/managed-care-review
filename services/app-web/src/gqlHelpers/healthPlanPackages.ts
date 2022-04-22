import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import {
    HealthPlanRevision,
    HealthPlanPackage,
    Submission as GQLSubmissionUnionType,
} from '../gen/gqlClient'

const getCurrentRevisionFromHealthPlanPackage = (
    submissionAndRevisions: HealthPlanPackage
): [HealthPlanRevision, HealthPlanFormDataType] | Error => {
    // check that package and valid revisions exist
    if (submissionAndRevisions) {
        if (
            !submissionAndRevisions.revisions ||
            submissionAndRevisions.revisions.length < 1
        ) {
            console.error(
                'ERROR: submission in summary has no submitted revision',
                submissionAndRevisions.revisions
            )
            return new Error(
                'Error fetching the latest revision. Please try again.'
            )
        }

        const newestRev = submissionAndRevisions.revisions.reduce(
            (acc, rev) => {
                if (rev.node.createdAt > acc.node.createdAt) {
                    return rev
                } else {
                    return acc
                }
            }
        ).node

        // Decode form data submitted by the state
        const healthPlanPackageFormDataResult = base64ToDomain(
            newestRev.formDataProto
        )
        if (healthPlanPackageFormDataResult instanceof Error) {
            console.error(
                'ERROR: got a proto decoding error',
                healthPlanPackageFormDataResult
            )
            return new Error('Error decoding the submission. Please try again.')
        } else {
            return [newestRev, healthPlanPackageFormDataResult]
        }
    } else {
        console.error('ERROR: no submission exists')
        return new Error('Error fetching the submission. Please try again.')
    }
}

export { getCurrentRevisionFromHealthPlanPackage }
export type { GQLSubmissionUnionType }
