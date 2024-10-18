import type {
    ContractType,
    UnlockedContractType,
    ContractRevisionType,
    ContractPackageSubmissionType,
} from '../../domain-models'

const getLastContractSubmission = (
    contract: ContractType | UnlockedContractType
): ContractPackageSubmissionType | undefined => {
    return (
        (contract.packageSubmissions && contract.packageSubmissions[0]) ??
        undefined
    )
}
const getContractRev = (
    contract: ContractType | UnlockedContractType
): ContractRevisionType | undefined => {
    if (contract.draftRevision) {
        return contract.draftRevision
    } else {
        return getLastContractSubmission(contract)?.contractRevision
    }
}
const isContractOnly = (contract: ContractType): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_ONLY'
}

const isBaseContract = (contract: ContractType): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'BASE'
}

const isContractAmendment = (contract: ContractType): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'AMENDMENT'
}

const isCHIPOnly = (contract: ContractType): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.populationCovered === 'CHIP'
}

const isContractAndRates = (contract: ContractType): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_AND_RATES'
}

const isContractWithProvisions = (contract: ContractType): boolean =>
    isContractAmendment(contract) ||
    (isBaseContract(contract) && !isCHIPOnly(contract))

const isSubmitted = (contract: ContractType): boolean =>
    contract.status === 'SUBMITTED'

export {
    isBaseContract,
    isCHIPOnly,
    isContractOnly,
    isContractAndRates,
    isContractAmendment,
    isSubmitted,
    isContractWithProvisions,
    getLastContractSubmission,
}
