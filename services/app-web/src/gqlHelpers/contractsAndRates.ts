/*
These helpers help you access nested data from the Contract and Rate Apollo Client types
If the data doesn't exist, returns undefined reliably
*/

import { Contract, ContractFormData, ContractPackageSubmission, Rate, RateRevision } from "../gen/gqlClient"


function getVisibleLatestRateRevisions(contract: Contract, isEditing: boolean): RateRevision[] | undefined {
    if (isEditing) {
        if (!contract.draftRates) {
            console.error('Programming Error: on the rate details page with no draft rates')
            return undefined
        }
        const rateRevs = []
        for (const rate of contract.draftRates) {
            // if this is a child rate, return draft revision
            if (rate.parentContractID === contract.id) {
                if (!rate.draftRevision) {
                    // TODO: this error will likely no longer apply once we have Unlock/Submit Rate
                    // child rates will no longer be assumed to be unlocked with their parent contracts
                    console.error('Programming Error: A child rate is not a draft')
                    return undefined
                }
                rateRevs.push(rate.draftRevision)
            } else {
                // otherwise return the latest revision submitted.
                const lastRateSubmission = rate.revisions[0]
                if (!lastRateSubmission) {
                    console.error('Programming Error: non-child rate was not previously submitted')
                    return undefined
                }
                rateRevs.push(lastRateSubmission)
            }
        } 
        return rateRevs
    } else {
        const lastContractSubmission = getLastContractSubmission(contract)
        if (!lastContractSubmission) {
            console.error('Programming Error: no contract submission for a contract were not editing')
            return undefined
        }
        return lastContractSubmission.rateRevisions
    }
}

// returns draft form data for unlocked and draft, and last package submission data for submitted or resubmitted
// only state users get to see draft data.
const getVisibleLatestContractFormData = (contract: Contract, isStateUser: boolean): ContractFormData | undefined =>{
   if (isStateUser) {
      return contract.draftRevision?.formData ||
            getLastContractSubmission(contract)?.contractRevision.formData
   }
   return getLastContractSubmission(contract)?.contractRevision.formData
}

const getLastContractSubmission = (contract: Contract): ContractPackageSubmission | undefined => {
    return (contract.packageSubmissions && contract.packageSubmissions[0]) ?? undefined
}

const getDraftRates = (contract: Contract): Rate[] | undefined => {
    return (contract.draftRates && contract.draftRates[0]) ? contract.draftRates : undefined
}

export {getDraftRates, getLastContractSubmission, getVisibleLatestContractFormData, getVisibleLatestRateRevisions}
