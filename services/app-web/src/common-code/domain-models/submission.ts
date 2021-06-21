import { DraftSubmissionType } from './DraftSubmissionType'
import { StateSubmissionType } from './StateSubmissionType'

const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isStateSubmission = (sub: unknown): sub is StateSubmissionType => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub as StateSubmissionType
        return (
            maybeStateSub.status === 'SUBMITTED' &&
            maybeStateSub.contractType !== undefined &&
            maybeStateSub.contractDateStart !== undefined &&
            maybeStateSub.contractDateEnd !== undefined &&
            maybeStateSub.documents.length !== 0 &&
            maybeStateSub.managedCareEntities.length !== 0 &&
            maybeStateSub.federalAuthorities.length !== 0
        )
    }
    return false
}

const isDraftSubmission = (sub: unknown): sub is DraftSubmissionType => {
    if (sub && typeof sub === 'object') {
        if ('status' in sub) {
            const maybeDraft = sub as { status: unknown }

            return (
                maybeDraft.status === 'DRAFT' && !('submittedAt' in maybeDraft)
            )
        }
    }

    return false
}

export {
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
    isDraftSubmission,
}
