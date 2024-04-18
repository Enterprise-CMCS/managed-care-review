/*
These helpers help you access nested data from the Contract and Rate Apollo Client types
If the data doesn't exist, returs undefined reliably
*/

import { Contract, ContractFormData, ContractPackageSubmission, Rate } from "../gen/gqlClient"

// returns draft form data for unlocked and draft, and last package submission data for submitted or resubmitted
const getLatestContractFormData = (contract: Contract): ContractFormData | undefined =>{
   return contract.draftRevision?.formData ||
            getLastContractSubmission(contract)?.contractRevision.formData
}

const getLastContractSubmission = (contract: Contract): ContractPackageSubmission | undefined => {
    return (contract.packageSubmissions && contract.packageSubmissions[0]) ?? undefined
}

const getDraftRates = (contract: Contract): Rate[] | undefined => {
    return (contract.draftRates && contract.draftRates[0]) ? contract.draftRates : undefined
}

export {getDraftRates, getLastContractSubmission, getLatestContractFormData}