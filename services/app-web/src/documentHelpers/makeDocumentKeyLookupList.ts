import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import { HealthPlanPackage } from '../gen/gqlClient'
import { parseKey } from '../common-code/s3URLEncoding'

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
): LookupListType | Error => {
    const docBuckets = [
        'contractDocuments',
        'rateDocuments',
        'documents',
    ] as const
    const lookupList: LookupListType = {
        currentDocuments: [],
        previousDocuments: [],
    }

    const revisions = submissions.revisions

    for (let index = 0; index < revisions.length; index++) {
        const revisionData = base64ToDomain(revisions[index].node.formDataProto)
        if (revisionData instanceof Error) {
            return new Error(
                'Failed to read submission data; unable to display documents'
            )
        }
        docBuckets.forEach((bucket) => {
            if (bucket === 'rateDocuments') {
                revisionData.rateInfos.forEach(rateInfo => {
                    rateInfo[bucket].forEach((doc) => {
                        const key = getKey(doc.s3URL)
                        if (key && index === 0) {
                            lookupList.currentDocuments.push(key)
                        } else if (key && index > 0) {
                            lookupList.previousDocuments.push(key)
                        }
                    })
                })
            } else {
                revisionData[bucket].forEach((doc) => {
                    const key = getKey(doc.s3URL)
                    if (key && index === 0) {
                        lookupList.currentDocuments.push(key)
                    } else if (key && index > 0) {
                        lookupList.previousDocuments.push(key)
                    }
                })
            }
        })
    }

    return lookupList
}
