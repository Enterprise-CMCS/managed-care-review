import { base64ToDomain } from '../proto/stateSubmission'
import { Submission2 } from '../../gen/gqlClient'
import { DocumentDateLookupTable } from '../../pages/SubmissionSummary/SubmissionSummary'
export const makeDateTable = (
    submissions: Submission2
): DocumentDateLookupTable | undefined => {
    const docBuckets = [
        'contractDocuments',
        'rateDocuments',
        'documents',
    ] as const
    const lookupTable = {} as DocumentDateLookupTable
    if (submissions) {
        submissions.revisions.forEach((revision) => {
            const revisionData = base64ToDomain(
                revision.revision.submissionData
            )
            if (revisionData instanceof Error) {
                console.error(
                    'failed to read submission data; unable to display document dates'
                )
                return
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
