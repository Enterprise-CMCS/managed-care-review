import {
    ExpandedRevisionsType,
    RevisionsLookupType,
} from '../gqlHelpers/fetchHealthPlanPackageWrapper'
import { getAllDocuments } from './getAllDocuments'

// DocumentDateLookupTableType -  { document lookup key string : date string for "date added" }
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
// makeDateTable - generates unique document keys and their "date added"
// used for date added column on UploadedDocumentsTable displayed in SubmissionSummary and ReviewSubmit
// documents without a submitted date are excluded from list
// logic for unique document keys comes from getDocumentKey -  This can be simplified once we have doc.sha everywhere
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
                const documentKey = doc.sha256 ? doc.sha256 : doc.s3URL
                const dateAdded = getDateAdded(revision)
                if (dateAdded) lookupTable[documentKey] = dateAdded
            })
        }
    )
    return lookupTable
}

export { makeDocumentDateTable }
export type { DocumentDateLookupTableType }
