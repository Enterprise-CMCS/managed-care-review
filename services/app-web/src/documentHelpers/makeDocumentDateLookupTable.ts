import {
    ExpandedRevisionsType,
    RevisionsLookupType,
} from '../gqlHelpers/fetchHealthPlanPackageWrapper'
import { getAllDocuments } from './getAllDocuments'
import { getDocumentKey } from './getDocumentKey'

// DocumentDateLookupTableType -  { S3 key string : date string for "date added" }
type DocumentDateLookupTableType = {
    [key: string]: string | undefined
}

// getDateAdded - picks out the submit info updatedAt date for a revision
// value is undefined if document not yet submitted
const getDateAdded = (
    revisionData: ExpandedRevisionsType
): string | undefined => {
    return revisionData.submitInfo?.updatedAt
}
// makeDateTable - generates document S3 keys and their "date added"
// used for date added column on UploadedDocumentsTable displayed in SubmissionSummary and ReviewSubmit
function makeDocumentDateTable(
    revisionsLookup: RevisionsLookupType
): DocumentDateLookupTableType {
    const lookupTable: DocumentDateLookupTableType = {}
    Object.keys(revisionsLookup).forEach(
        (revisionId: string, index: number) => {
            const revision = revisionsLookup[revisionId]
            if (index === 1) {
                // second most recent revision
                lookupTable['previousSubmissionDate'] = getDateAdded(revision) // used in UploadedDocumentsTable to determine if we should show NEW tag
            }

            const allDocuments = getAllDocuments(revision.formData)
            allDocuments.forEach((doc) => {
                const documentKey = getDocumentKey(doc)
                lookupTable[documentKey] = getDateAdded(revision)
            })
        }
    )

    return lookupTable
}

export { makeDocumentDateTable }
export type { DocumentDateLookupTableType }
