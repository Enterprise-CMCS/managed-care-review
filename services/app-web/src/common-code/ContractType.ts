import { Contract } from '../gen/gqlClient'

const isContractOnly = (contract: Contract): boolean => {
    if (contract.draftRevision) {
        return contract.draftRevision.formData.submissionType === 'CONTRACT_ONLY'
    } else if (contract.packageSubmissions[0]) {
        return contract.packageSubmissions[0].contractRevision.formData.submissionType === 'CONTRACT_ONLY'
    } else {
        return false
    }
}


const isBaseContract = (contract: Contract): boolean => {
    if (contract.draftRevision) {
        return contract.draftRevision.formData.contractType === 'BASE'
    } else if (contract.packageSubmissions[0]) {
        return contract.packageSubmissions[0].contractRevision.formData.contractType === 'BASE'
    } else {
        return false
    }
}

const isContractAmendment = (contract: Contract): boolean => {
    if (contract.draftRevision) {
        return contract.draftRevision.formData.contractType === 'AMENDMENT'
    } else if (contract.packageSubmissions[0]) {
        return contract.packageSubmissions[0].contractRevision.formData.contractType === 'AMENDMENT'
    } else {
        return false
    }
}

const isCHIPOnly = (contract: Contract): boolean => {
    if (contract.draftRevision) {
        return contract.draftRevision.formData.populationCovered === 'CHIP'
    } else if (contract.packageSubmissions[0]) {
        return contract.packageSubmissions[0].contractRevision.formData.populationCovered === 'CHIP'
    } else {
        return false
    }
}

const isContractAndRates = (contract: Contract): boolean => {
    if (contract.draftRevision) {
        return contract.draftRevision.formData.submissionType === 'CONTRACT_AND_RATES'
    } else if (contract.packageSubmissions[0]) {
        return contract.packageSubmissions[0].contractRevision.formData.submissionType === 'CONTRACT_AND_RATES'
    } else {
        return false
    }
}

const isContractWithProvisions = (contract: Contract): boolean =>
    isContractAmendment(contract) || (isBaseContract(contract) && !isCHIPOnly(contract))

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
