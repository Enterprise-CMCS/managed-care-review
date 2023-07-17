import { parseKey } from '../common-code/s3URLEncoding'
import { RevisionsLookupType } from '../gqlHelpers/fetchHealthPlanPackageWrapper'
import { getAllDocuments } from './getAllDocuments'

// CurrentPreviousDocsLookup - array of document keys for currentDocuments and previousDocuments

type LookupListType = {
    currentDocuments: string[]
    previousDocuments: string[]
}

const getKey = (s3URL: string) => {
    const key = parseKey(s3URL)
    return key instanceof Error ? null : key
}

// makeDocumentS3KeyLookup - generates list of currentDocuments and previousDocuments by s3Key
// this is used to to determine if can delete a document from s3 after it removed from the FileUpload UI on the  documents pages - ContractDetails, RateDetails, Documents

function makeDocumentS3KeyLookup(
    revisionsLookup: RevisionsLookupType
): LookupListType {
    const currentDocumentsSet = new Set<string>()
    const previousDocumentsSet = new Set<string>()

    Object.keys(revisionsLookup).forEach(
        (revisionId: string, index: number) => {
            const revisionData = revisionsLookup[revisionId].formData
            const allDocuments = getAllDocuments(revisionData)
            if (index === 0) {
                allDocuments.forEach((doc) => {
                    const s3Key = getKey(doc.s3URL)
                    if (!s3Key) {
                        console.error(
                            `makeDocumentS3KeyLookup- Failed to read S3 key for $${doc.name} - ${doc.s3URL}`
                        )
                        // fail silently, just return good documents
                    } else {
                        currentDocumentsSet.add(s3Key)
                    }
                })
            } else {
                allDocuments.forEach((doc) => {
                    const s3Key = getKey(doc.s3URL)
                    if (!s3Key) {
                        console.error(
                            `makeDocumentS3KeyLookup - Failed to read S3 key for $${doc.name} - ${doc.s3URL}`
                        )
                        // fail silently, just return good documents
                    } else {
                        previousDocumentsSet.add(s3Key)
                    }
                })
            }
        }
    )
    return {
        currentDocuments: [...currentDocumentsSet],
        previousDocuments: [...previousDocumentsSet],
    }
}

export { makeDocumentS3KeyLookup }
