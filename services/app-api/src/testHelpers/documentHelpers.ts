import type { GenericDocument } from '../gen/gqlServer'

// Clear document metadata that is added by API
// enables direct compare between document lists (created by FE and submitted by users)
// and the return  document lists (created by BE parsers and API and include metadata such as dateAdded)
const clearDocMetadata = (documents?: GenericDocument[]): GenericDocument[] => {
    if (!documents) return []
    return documents.map((doc) => {
        // clear out metadata fields
        delete doc['dateAdded']
        return doc
    })
}

export { clearDocMetadata }
