import { HealthPlanFormDataType } from '@mc-review/hpp'
import { base64ToDomain } from '@mc-review/hpp'

import { HealthPlanRevision, HealthPlanPackage } from './gen/gqlClient'
import { recordJSException } from '@mc-review/otel-helpers'

// returns nil if no revision has been submitted
function getLastSubmittedRevision(
    pkg: HealthPlanPackage
): HealthPlanRevision | undefined {
    const edge = pkg.revisions.find((rEdge) => rEdge.node.submitInfo)
    return edge?.node
}

const getCurrentRevisionFromHealthPlanPackage = (
    submissionAndRevisions: HealthPlanPackage
): [HealthPlanRevision, HealthPlanFormDataType] | Error => {
    // check that package and valid revisions exist
    if (submissionAndRevisions) {
        if (
            !submissionAndRevisions.revisions ||
            submissionAndRevisions.revisions.length < 1
        ) {
            recordJSException(
                `getCurrentRevisionFromHealthPlanPackage: submission has no submitted revision. ID:
                ${submissionAndRevisions.id}`
            )
            return new Error(
                'Error fetching the latest revision. Please try again.'
            )
        }
        // rely entirely on server-side sorting of revisions by created-at, newest first
        const newestRev = submissionAndRevisions.revisions[0].node

        // Decode form data submitted by the state
        const healthPlanPackageFormDataResult = base64ToDomain(
            newestRev.formDataProto
        )
        if (healthPlanPackageFormDataResult instanceof Error) {
            recordJSException(
                `getCurrentRevisionFromHealthPlanPackage: proto decoding error. ID: 
                ${submissionAndRevisions.id}. Error message: ${healthPlanPackageFormDataResult}`
            )
            return new Error('Error decoding the submission. Please try again.')
        } else {
            return [newestRev, healthPlanPackageFormDataResult]
        }
    } else {
        recordJSException(
            `getCurrentRevisionFromHealthPlanPackage: no submission exists.`
        )
        return new Error('Error fetching the submission. Please try again.')
    }
}

export { getCurrentRevisionFromHealthPlanPackage, getLastSubmittedRevision }
