import { DraftSubmission, DraftSubmissionUpdates } from '../../gen/gqlClient'

/*
    Clean out _typename from submission
    If you pass gql __typename within a mutation input things break; however,  __typename comes down on cached queries by default
    This function is needed to remove _typename  for optional objects such as contractAmendmentInfo and rateAmendmentInfo
*/
const omitTypename = (key: unknown, value: unknown) =>
    key === '__typename' ? undefined : value

export function stripTypename<T>(input: T): T {
    return JSON.parse(JSON.stringify(input), omitTypename)
}

// this function cleans a draft submissions values whenever the draft is updated
function cleanDraftSubmission(
    draftUpdate: DraftSubmissionUpdates
): DraftSubmissionUpdates {
    // remove rate data if submission type is not contract only
    if (draftUpdate.submissionType === 'CONTRACT_ONLY') {
        delete draftUpdate.rateType
        delete draftUpdate.rateDateStart
        delete draftUpdate.rateDateEnd
        delete draftUpdate.rateDateCertified
        delete draftUpdate.rateAmendmentInfo
        draftUpdate.rateDocuments = []
        draftUpdate.actuaryContacts = []
        delete draftUpdate.actuaryCommunicationPreference
    }
    return draftUpdate
}

// this function takes a DraftSubmission and picks off all the keys that are valid
// keys for DraftSubmissionUpdates. This facilitates making an update request given
// an extant draft
// There's probably some Typescript Cleverness™ we could do for this mapping function
// but for now the compiler complains if you forget anything so ¯\_(ツ)_/¯
function updatesFromSubmission(draft: DraftSubmission): DraftSubmissionUpdates {
    return {
        programID: draft.programID,
        submissionType: draft.submissionType,
        submissionDescription: draft.submissionDescription,
        documents: stripTypename(draft.documents),
        contractType: draft.contractType,
        contractDocuments: stripTypename(draft.contractDocuments),
        contractDateStart: draft.contractDateStart,
        contractDateEnd: draft.contractDateEnd,
        federalAuthorities: draft.federalAuthorities,
        managedCareEntities: draft.managedCareEntities,
        contractAmendmentInfo: stripTypename(draft.contractAmendmentInfo),
        rateType: draft.rateType,
        rateDocuments: stripTypename(draft.rateDocuments),
        rateDateStart: draft.rateDateStart,
        rateDateEnd: draft.rateDateEnd,
        rateDateCertified: draft.rateDateCertified,
        rateAmendmentInfo: stripTypename(draft.rateAmendmentInfo),
        stateContacts: stripTypename(draft.stateContacts),
        actuaryContacts: stripTypename(draft.actuaryContacts),
        actuaryCommunicationPreference: draft.actuaryCommunicationPreference,
    }
}

export { cleanDraftSubmission, updatesFromSubmission }
