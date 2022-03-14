import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { DraftSubmission, DraftSubmissionUpdates , Submission2} from '../../gen/gqlClient'
import { formatGQLDate } from '../../dateHelpers'
/*
    Clean out _typename from submission
    If you pass gql __typename within a mutation input things break; however,  __typename comes down on cached queries by default
    This function is needed to remove _typename  for optional objects such as contractAmendmentInfo and rateAmendmentInfo
*/
function omitTypename<T>(key: unknown, value: T): T | undefined {
    return key === '__typename' ? undefined : value
}

function stripTypename<T>(input: T): T {
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
        programIDs: draft.programIDs,
        submissionType: draft.submissionType,
        submissionDescription: draft.submissionDescription,
        documents: draft.documents,
        contractType: draft.contractType,
        contractExecutionStatus: draft.contractExecutionStatus,
        contractDocuments: draft.contractDocuments,
        contractDateStart: formatGQLDate(draft.contractDateStart),
        contractDateEnd: formatGQLDate(draft.contractDateEnd),
        federalAuthorities: draft.federalAuthorities,
        managedCareEntities: draft.managedCareEntities,
        contractAmendmentInfo: draft.contractAmendmentInfo,
        rateType: draft.rateType,
        rateDocuments: draft.rateDocuments,
        rateDateStart: formatGQLDate(draft.rateDateStart),
        rateDateEnd: formatGQLDate(draft.rateDateEnd),
        rateDateCertified: formatGQLDate(draft.rateDateCertified),
        rateAmendmentInfo: draft.rateAmendmentInfo,
        stateContacts: draft.stateContacts,
        actuaryContacts: draft.actuaryContacts,
        actuaryCommunicationPreference: draft.actuaryCommunicationPreference,
    }
}

// this is needed as we change our api - right now only used in tests.
function updatesFromSubmission2(draft: Submission2): DraftSubmissionUpdates {
    const formData = base64ToDomain(draft.revisions[0].revision.submissionData)
    if (formData instanceof Error) throw Error 

    return {
        programIDs: formData.programIDs,
        submissionType: formData.submissionType,
        submissionDescription: formData.submissionDescription,
        documents: formData.documents,
        contractType: formData.contractType,
        contractExecutionStatus: formData.contractExecutionStatus,
        contractDocuments: formData.contractDocuments,
        contractDateStart: formData.contractDateStart,
        contractDateEnd: formData.contractDateEnd,
        federalAuthorities: formData.federalAuthorities,
        managedCareEntities: formData.managedCareEntities,
        contractAmendmentInfo: formData.contractAmendmentInfo,
        rateType: formData.rateType,
        rateDocuments: formData.rateDocuments,
        rateDateStart: formData.rateDateStart,
        rateDateEnd: formData.rateDateEnd,
        rateDateCertified: formData.rateDateCertified,
        rateAmendmentInfo: formData.rateAmendmentInfo,
        stateContacts: formData.stateContacts,
        actuaryContacts: formData.actuaryContacts,
        actuaryCommunicationPreference: formData.actuaryCommunicationPreference,
    }
}

export {
    cleanDraftSubmission,
    stripTypename,
    omitTypename,
    updatesFromSubmission,
    updatesFromSubmission2
}
