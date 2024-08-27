import {
    ExpandedRevisionsType,
    RevisionsLookupType,
} from '@mc-review/gql-helpers'
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
        previousSubmissionDate: null, // the last time there was a submission on this package
    }
    const listOfRevisionLookups = Object.keys(revisionsLookup)
    listOfRevisionLookups.forEach((revisionId: string, index) => {
        const revision = revisionsLookup[revisionId]

        const submitDate = revision.submitInfo?.updatedAt
        if (submitDate && (listOfRevisionLookups.length === 1 || index === 1)) {
            // if we have a package with only one submitted revision, use that - otherwise use whatever in is the 1 index because thats the last submitted
            lookupTable['previousSubmissionDate'] = submitDate
        }

        const allDocuments = getAllDocuments(revision.formData)
        allDocuments.forEach((doc) => {
            const documentKey = doc.sha256 ? doc.sha256 : doc.s3URL
            const dateAdded = getDateAdded(revision)
            if (dateAdded) lookupTable[documentKey] = dateAdded
        })
    })
    return lookupTable
}

export { makeDocumentDateTable }
export type { DocumentDateLookupTableType }
