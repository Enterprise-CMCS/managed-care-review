import { SubmissionDocument } from '../common-code/healthPlanFormDataType'

export const getDocumentKey = (doc: SubmissionDocument): string => {
    return doc.sha256 ? doc.sha256 : doc.s3URL
}
