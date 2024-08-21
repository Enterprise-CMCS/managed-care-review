import { Contract, ContractRevision, UnlockedContract } from '../gen/gqlClient'
import { getLastContractSubmission } from '../gqlHelpers/contractsAndRates'

const getContractRev = (contract: Contract | UnlockedContract): ContractRevision | undefined => {
    if (contract.draftRevision) {
        return contract.draftRevision
    } else {
        return getLastContractSubmission(contract)?.contractRevision
    }
}
const isContractOnly = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_ONLY' 
}


const isBaseContract = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'BASE'
}

const isContractAmendment = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'AMENDMENT'
}

const isCHIPOnly = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.populationCovered === 'CHIP'
}

const isContractAndRates = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_AND_RATES'
}

const isContractWithProvisions = (contract: Contract | UnlockedContract): boolean =>
    isContractAmendment(contract) || (isBaseContract(contract) && !isCHIPOnly(contract))

const isSubmitted = (contract: Contract | UnlockedContract): boolean =>
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
