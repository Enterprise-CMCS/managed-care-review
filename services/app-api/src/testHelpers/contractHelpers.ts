import { InsertContractArgsType } from '../postgres/contractAndRates/insertContract'

const createDraftContractData = (
    contractArgs?: Partial<InsertContractArgsType>
): InsertContractArgsType => {
    return {
        stateCode: contractArgs?.stateCode ?? 'MN',
        submissionType: contractArgs?.submissionType ?? 'CONTRACT_AND_RATES',
        submissionDescription:
            contractArgs?.submissionDescription ?? 'Contract 1.0',
        contractType: contractArgs?.contractType ?? 'BASE',
        programIDs: contractArgs?.programIDs ?? ['PMAP'],
        populationCovered: contractArgs?.populationCovered ?? 'MEDICAID',
        riskBasedContract: contractArgs?.riskBasedContract ?? false,
    }
}

export { createDraftContractData }
