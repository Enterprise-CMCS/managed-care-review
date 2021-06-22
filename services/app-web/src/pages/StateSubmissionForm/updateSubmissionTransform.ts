import {
    DraftSubmission,
    DraftSubmissionUpdates,
    Document,
    DocumentInput,
} from '../../gen/gqlClient'

// this function takes a DraftSubmission and picks off all the keys that are valid
// keys for DraftSubmissionUpdates. This facilitates making an update request given
// an extant draft
// There's probably some Typescript Cleverness™ we could do for this mapping function
// but for now the compiler complains if you forget anything so ¯\_(ツ)_/¯
export function updatesFromSubmission(
    draft: DraftSubmission
): DraftSubmissionUpdates {
    return {
        programID: draft.programID,
        submissionType: draft.submissionType,
        submissionDescription: draft.submissionDescription,
        documents: draft.documents.map(
            (doc: Document): DocumentInput => {
                return {
                    name: doc.name,
                    s3URL: doc.s3URL,
                }
            }
        ),
        contractType: draft.contractType,
        contractDateStart: draft.contractDateStart,
        contractDateEnd: draft.contractDateEnd,
        federalAuthorities: draft.federalAuthorities,
        managedCareEntities: draft.managedCareEntities,
        contractAmendmentInfo: draft.contractAmendmentInfo,
        rateType: draft.rateType,
        rateDateStart: draft.rateDateStart,
        rateDateEnd: draft.rateDateEnd,
        rateDateCertified: draft.rateDateCertified,
        rateAmendmentInfo: draft.rateAmendmentInfo,
    }
}
