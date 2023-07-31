import { SubmissionDocument } from '../common-code/healthPlanFormDataType'

// getDocumentKey - Returns a unique identifier for the document. This should be the document sha.
// Not to be confused with "s3Key" which is a different field / use case
const getDocumentKey = (doc: SubmissionDocument): string => {
    return doc.sha256 ? doc.sha256 : doc.s3URL
}

export { getDocumentKey }
