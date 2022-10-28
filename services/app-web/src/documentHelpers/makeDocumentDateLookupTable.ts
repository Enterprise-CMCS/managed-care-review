import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import { HealthPlanPackage } from '../gen/gqlClient'
import { DocumentDateLookupTable } from '../pages/SubmissionSummary/SubmissionSummary'
import { recordJSException } from '../otelHelpers/tracingHelper'
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
                recordJSException(
                    `makeDocumentLookupTable: failed to read submission data; unable to display document dates. ID: ${submissions.id} Error message: ${revisionData.message}`
                )
                return
            }
            if (index === 1) {
                // second most recent revision
                lookupTable['previousSubmissionDate'] = revisionData.updatedAt
            }
            docBuckets.forEach((bucket) => {
                if (bucket === 'rateDocuments') {
                    revisionData.rateInfos.forEach((rateInfo) => {
                        rateInfo.rateDocuments.forEach(doc => {
                            lookupTable[doc.name] = revisionData.updatedAt
                        })
                    })
                } else {
                    revisionData[bucket].forEach((doc) => {
                        lookupTable[doc.name] = revisionData.updatedAt
                    })
                }
            })
        })
        return lookupTable
    }
}
