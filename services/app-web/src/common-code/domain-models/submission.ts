import { DraftSubmissionType } from './DraftSubmissionType'
import { StateSubmissionType } from './StateSubmissionType'

const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isRateAmendment = (sub: DraftSubmissionType): boolean =>
    sub.rateType === 'AMENDMENT'

const hasValidContract = (sub: DraftSubmissionType): boolean =>
    sub.contractType !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0

const hasValidRates = (sub: DraftSubmissionType): boolean => {
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

const hasValidDocuments = (sub: DraftSubmissionType): boolean =>
    sub.documents.length !== 0

const isStateSubmission = (
    sub: DraftSubmissionType | Record<string, unknown>
): sub is StateSubmissionType =>
    hasValidContract(sub as DraftSubmissionType) &&
    // TODO: Add when review and submit is implemented
    // hasValidRates(sub as DraftSubmissionType) &&
    hasValidDocuments(sub as DraftSubmissionType)

export {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
}
