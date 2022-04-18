import { base64ToDomain } from '../proto/stateSubmission'
import { HealthPlanPackage } from '../../gen/gqlClient'
import { DocumentDateLookupTable } from '../../pages/SubmissionSummary/SubmissionSummary'
export const makeDateTable = (
    submissions: HealthPlanPackage
): DocumentDateLookupTable | undefined => {
    const docBuckets = [
        'contractDocuments',
        'rateDocuments',
        'documents',
    ] as const
    const lookupTable = {} as DocumentDateLookupTable
    if (submissions) {
        submissions.revisions.forEach((revision, index) => {
            const revisionData = base64ToDomain(revision.node.formDataProto)

            if (revisionData instanceof Error) {
                console.error(
                    'failed to read submission data; unable to display document dates'
                )
                return
            }
            if (index === 1) {
                // second most recent revision
                lookupTable['previousSubmissionDate'] = revisionData.updatedAt
            }
            docBuckets.forEach((bucket) => {
                revisionData[bucket].forEach((doc) => {
                    lookupTable[doc.name] = revisionData.updatedAt
                })
            })
        })
        return lookupTable
    }
}
