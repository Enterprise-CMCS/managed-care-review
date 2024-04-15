/*
These helpers help you access nested data from the Contract and Rate Apollo Client types
If the data doesn't exist, returs undefined reliably
*/

import { Contract, ContractPackageSubmission, Rate } from "../gen/gqlClient"

const getLastContractSubmission = (contract: Contract): ContractPackageSubmission | undefined => {
    return (contract.packageSubmissions && contract.packageSubmissions[0]) ?? undefined
}

const getDraftRates = (contract: Contract): Rate[] | undefined => {
    return (contract.draftRates && contract.draftRates[0]) ? contract.draftRates : undefined
}

export {getDraftRates, getLastContractSubmission}