import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import { HealthPlanPackage } from '../gen/gqlClient'
import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { DocumentDateLookupTable } from '../pages/SubmissionSummary/SubmissionSummary'
import { recordJSException } from '../otelHelpers/tracingHelper'
import { getDocumentKey } from './getDocumentKey'

const DocBuckets = ['contractDocuments', 'rateDocuments', 'documents'] as const

export function makeDateTableFromFormData(
    formDatas: HealthPlanFormDataType[]
): DocumentDateLookupTable {
    const lookupTable: DocumentDateLookupTable = {}

    formDatas.forEach((revisionData, index) => {
        if (index === 1) {
            // second most recent revision
            lookupTable['previousSubmissionDate'] = revisionData.updatedAt
        }
        DocBuckets.forEach((bucket) => {
            if (bucket === 'rateDocuments') {
                revisionData.rateInfos.forEach((rateInfo) => {
                    rateInfo.rateDocuments.forEach((doc) => {
                        const documentKey = getDocumentKey(doc)
                        lookupTable[documentKey] = revisionData.updatedAt
                    })
                    rateInfo.supportingDocuments.forEach((doc) => {
                        const documentKey = getDocumentKey(doc)
                        lookupTable[documentKey] = revisionData.updatedAt
                    })
                })
            } else {
                revisionData[bucket].forEach((doc) => {
                    const documentKey = getDocumentKey(doc)
                    lookupTable[documentKey] = revisionData.updatedAt
                })
            }
        })
    })

    return lookupTable
}

export const makeDateTable = (
    submissions: HealthPlanPackage
): DocumentDateLookupTable | undefined => {
    const formDatas: HealthPlanFormDataType[] = []
    for (const revision of submissions.revisions) {
        const revisionData = base64ToDomain(revision.node.formDataProto)

        if (revisionData instanceof Error) {
            recordJSException(
                `makeDocumentLookupTable: failed to read submission data; unable to display document dates. ID: ${submissions.id} Error message: ${revisionData.message}`
            )
            // We are just ignoring this error in this code path.
        } else {
            formDatas.push(revisionData)
        }
    }

    return makeDateTableFromFormData(formDatas)
}
