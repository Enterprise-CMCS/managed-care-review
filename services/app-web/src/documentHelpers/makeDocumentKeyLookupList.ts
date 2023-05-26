import { base64ToDomain } from '@managed-care-review/common-code/proto'
import { HealthPlanPackage } from '../gen/gqlClient'
import { parseKey } from '@managed-care-review/common-code/s3URLEncoding'
import { HealthPlanFormDataType } from '@managed-care-review/common-code/healthPlanFormDataType'

export type LookupListType = {
    currentDocuments: string[]
    previousDocuments: string[]
}

const getKey = (s3URL: string) => {
    const key = parseKey(s3URL)
    return key instanceof Error ? null : key
}

export function makeDocumentListFromFormDatas(
    formDatas: HealthPlanFormDataType[]
): LookupListType {
    const docBuckets = [
        'contractDocuments',
        'rateDocuments',
        'documents',
    ] as const
    const lookupList: LookupListType = {
        currentDocuments: [],
        previousDocuments: [],
    }

    for (let index = 0; index < formDatas.length; index++) {
        const revisionData = formDatas[index]
        docBuckets.forEach((bucket) => {
            if (bucket === 'rateDocuments') {
                revisionData.rateInfos.forEach((rateInfo) => {
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

export const makeDocumentList = (
    submissions: HealthPlanPackage
): LookupListType | Error => {
    const revisions = submissions.revisions

    const formDatas: HealthPlanFormDataType[] = []
    for (let index = 0; index < revisions.length; index++) {
        const revisionData = base64ToDomain(revisions[index].node.formDataProto)
        if (revisionData instanceof Error) {
            return new Error(
                'Failed to read submission data; unable to display documents'
            )
        }
        formDatas.push(revisionData)
    }

    return makeDocumentListFromFormDatas(formDatas)
}
