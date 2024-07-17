import type {
    Contract,
    ContractPackageSubmission,
    ContractRevision,
} from '../gen/gqlServer'

const getLastContractSubmission = (
    contract: Contract
): ContractPackageSubmission | undefined => {
    return (
        (contract.packageSubmissions && contract.packageSubmissions[0]) ??
        undefined
    )
}

const getContractRev = (contract: Contract): ContractRevision | undefined => {
    if (contract.draftRevision) {
        return contract.draftRevision
    } else {
        return getLastContractSubmission(contract)?.contractRevision
    }
}
const isContractOnly = (contract: Contract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_ONLY'
}

const isBaseContract = (contract: Contract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'BASE'
}

const isContractAmendment = (contract: Contract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'AMENDMENT'
}

const isCHIPOnly = (contract: Contract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.populationCovered === 'CHIP'
}

const isContractAndRates = (contract: Contract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_AND_RATES'
}

const isContractWithProvisions = (contract: Contract): boolean =>
    isContractAmendment(contract) ||
    (isBaseContract(contract) && !isCHIPOnly(contract))

const isSubmitted = (contract: Contract): boolean =>
    contract.status === 'SUBMITTED'

export {
    isContractWithProvisions,
    isBaseContract,
    isContractAmendment,
    isCHIPOnly,
    isContractOnly,
    isContractAndRates,
    isSubmitted,
}
