import { base64ToDomain } from '../proto/stateSubmission'
import { HealthPlanPackage } from '../../gen/gqlClient'
import { parseKey } from '../s3URLEncoding'

type LookupListType = {
    currentDocuments: string[]
    previousDocuments: string[]
}

const getKey = (s3URL: string) => {
    const key = parseKey(s3URL)
    return key instanceof Error ? null : key
}

export const makeDocumentList = (
    submissions: HealthPlanPackage
): LookupListType | undefined => {
    const docBuckets = [
        'contractDocuments',
        'rateDocuments',
        'documents',
    ] as const
    const lookupList: LookupListType = {
        currentDocuments: [],
        previousDocuments: [],
    }
    if (submissions) {
        const revisions = submissions.revisions
        if (revisions.length > 1) {
            revisions.forEach((revision, index) => {
                const revisionData = base64ToDomain(revision.node.formDataProto)
                if (revisionData instanceof Error) {
                    console.error(
                        'failed to read submission data; unable to display document dates'
                    )
                    return
                }
                docBuckets.forEach((bucket) => {
                    revisionData[bucket].forEach((doc) => {
                        const key = getKey(doc.s3URL)
                        if (key && index === 0) {
                            lookupList.currentDocuments.push(key)
                        } else if (key && index > 0) {
                            lookupList.previousDocuments.push(key)
                        }
                    })
                })
            })
        }
        return lookupList
    }
}
