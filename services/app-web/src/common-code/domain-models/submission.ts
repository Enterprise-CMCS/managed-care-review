import { DraftSubmissionType } from './DraftSubmissionType'
import { StateSubmissionType } from './StateSubmissionType'

const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isRateAmendment = (sub: StateSubmissionType): boolean =>
    sub.rateType === 'AMENDMENT'

const hasValidContract = (sub: StateSubmissionType): boolean =>
    sub.contractType !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0

const hasValidRates = (sub: StateSubmissionType): boolean => {
    if (sub.submissionType === 'CONTRACT_ONLY') return true

    const validBaseRate =
        sub.rateType !== undefined &&
        sub.rateDateCertified !== undefined &&
        sub.rateDateStart !== undefined &&
        sub.rateDateEnd !== undefined

    return isRateAmendment(sub)
        ? validBaseRate &&
              Boolean(
                  sub.rateAmendmentInfo &&
                      sub.rateAmendmentInfo.effectiveDateEnd &&
                      sub.rateAmendmentInfo.effectiveDateStart
              )
        : validBaseRate
}

const hasValidDocuments = (sub: StateSubmissionType): boolean =>
    sub.documents.length !== 0

const isStateSubmission = (sub: unknown): sub is StateSubmissionType => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub as StateSubmissionType
        return (
            maybeStateSub.status === 'SUBMITTED' &&
            hasValidContract(maybeStateSub) &&
            hasValidRates(maybeStateSub) &&
            hasValidDocuments(maybeStateSub)
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
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
    isDraftSubmission,
}
