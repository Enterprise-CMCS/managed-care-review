import {
    ExpandedRevisionsType,
    RevisionsLookupType,
} from '../gqlHelpers/fetchHealthPlanPackageWrapper'
import { getAllDocuments } from './getAllDocuments'
import { getDocumentKey } from './getDocumentKey'

// DocumentDateLookupTableType -  { document key string : date string for "date added" }
// see logic in getDocumentKey for how document key string is calculated
type DocumentDateLookupTableType = {
    previousSubmissionDate: string | null
    [key: string]: string | null
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
// documents without a date added all together are excluded
function makeDocumentDateTable(
    revisionsLookup: RevisionsLookupType
): DocumentDateLookupTableType {
    const lookupTable: DocumentDateLookupTableType = {
        previousSubmissionDate: null,
    }
    Object.keys(revisionsLookup).forEach(
        (revisionId: string, index: number) => {
            const revision = revisionsLookup[revisionId]
            if (index === 1) {
                // second most recent revision
                const previousSubmission = getDateAdded(revision) // used in UploadedDocumentsTable to determine if we should show NEW tag
                if (previousSubmission)
                    lookupTable['previousSubmissionDate'] = previousSubmission
            }

            const allDocuments = getAllDocuments(revision.formData)
            allDocuments.forEach((doc) => {
                const documentKey = getDocumentKey(doc)
                const dateAdded = getDateAdded(revision)
                if (dateAdded) lookupTable[documentKey] = dateAdded
            })
        }
    )
    return lookupTable
}

export { makeDocumentDateTable }
export type { DocumentDateLookupTableType }
