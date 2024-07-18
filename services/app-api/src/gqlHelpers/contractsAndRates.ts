/*
These helpers help you access nested data from the Contract and Rate Apollo Client types
If the data doesn't exist, returns undefined reliably
*/

import type {
    Contract,
    ContractFormData,
    ContractPackageSubmission,
    ContractRevision,
    Rate,
    RateRevision,
} from '../gen/gqlServer'
import type { ActuaryContact } from '../common-code/healthPlanFormDataType'
import { ActuaryFirmsRecord } from '../constants'

type RateRevisionWithIsLinked = {
    isLinked: boolean
} & RateRevision

// This function returns a revision with isLinked field as well manually calculated from parent rate
// There are cases where we need the revision itself to be able to track its own linked status, decontextualized from the parent rate or parent contract
function getVisibleLatestRateRevisions(
    contract: Contract,
    isEditing: boolean
): RateRevisionWithIsLinked[] | undefined {
    if (isEditing) {
        if (!contract.draftRates) {
            console.error(
                'Programming Error: on the rate details page with no draft rates'
            )
            return undefined
        }
        const rateRevs = []
        for (const rate of contract.draftRates) {
            // if this is a child rate, return draft revision
            if (rate.parentContractID === contract.id) {
                if (!rate.draftRevision) {
                    // TODO: this error will likely no longer apply once we have Unlock/Submit Rate
                    // child rates will no longer be assumed to be unlocked with their parent contracts
                    console.error(
                        'Programming Error: A child rate is not a draft'
                    )
                    return undefined
                }
                rateRevs.push({
                    ...rate.draftRevision,
                    isLinked: false,
                })
            } else {
                // otherwise return the latest revision submitted.
                // this code will have to be fixed when we move to rate history - should rely on packageSubmissions
                const lastRateSubmission = rate.revisions[0]
                if (!lastRateSubmission) {
                    console.error(
                        'Programming Error: non-child rate was not previously submitted'
                    )
                    return undefined
                }
                rateRevs.push({
                    ...lastRateSubmission,
                    isLinked: true,
                })
            }
        }
        return rateRevs
    } else {
        const lastContractSubmission = getLastContractSubmission(contract)
        if (!lastContractSubmission) {
            console.error(
                'Programming Error: no contract submission for a contract were not editing'
            )
            return undefined
        }

        return lastContractSubmission.rateRevisions.map((rrev) => {
            return {
                ...rrev,
                isLinked: rrev.rate
                    ? rrev.rate?.parentContractID !== contract.id
                    : false,
                // TODO: need more clarity about when the revision has the rate attached or not and make sure test mock data matches this. for now just assume not linked if that rate data is not coming down
            }
        })
    }
}

// returns draft form data for unlocked and draft, and last package submission data for submitted or resubmitted
// only state users get to see draft data.
const getVisibleLatestContractFormData = (
    contract: Contract | ContractRevision,
    isStateUser: boolean
): ContractFormData | undefined => {
    if (contract.__typename === 'Contract') {
        if (isStateUser) {
            return (
                contract.draftRevision?.formData ||
                getLastContractSubmission(contract)?.contractRevision.formData
            )
        }
        return getLastContractSubmission(contract)?.contractRevision.formData
    } else if (contract.__typename === 'ContractRevision') {
        return contract.formData
    }
}

const getLastContractSubmission = (
    contract: Contract
): ContractPackageSubmission | undefined => {
    return (
        (contract.packageSubmissions && contract.packageSubmissions[0]) ??
        undefined
    )
}

const getPackageSubmissionAtIndex = (
    contract: Contract,
    indx: number
): ContractPackageSubmission | undefined => {
    return contract.packageSubmissions[indx] ?? undefined
}
// revisionVersion is a integer used in the URLs for previous submission - numbering the submission in order from first submitted
const getIndexFromRevisionVersion = (
    contract: Contract,
    revisionVersion: number
) => contract.packageSubmissions.length - (Number(revisionVersion) - 1)
const getDraftRates = (contract: Contract): Rate[] | undefined => {
    return contract.draftRates && contract.draftRates[0]
        ? contract.draftRates
        : undefined
}

const getActuaryFirm = (actuaryContact: ActuaryContact): string => {
    if (
        actuaryContact.actuarialFirmOther &&
        actuaryContact.actuarialFirm === 'OTHER'
    ) {
        return actuaryContact.actuarialFirmOther
    } else if (
        actuaryContact.actuarialFirm &&
        ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    ) {
        return ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    } else {
        return ''
    }
}

export {
    getDraftRates,
    getLastContractSubmission,
    getVisibleLatestContractFormData,
    getVisibleLatestRateRevisions,
    getActuaryFirm,
    getPackageSubmissionAtIndex,
    getIndexFromRevisionVersion,
}
export type { RateRevisionWithIsLinked }
