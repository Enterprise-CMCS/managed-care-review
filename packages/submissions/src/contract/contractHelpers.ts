/*
These helpers help you access nested data from the Contract and Rate Apollo Client types
If the data doesn't exist, returns undefined reliably
*/
import {
    Contract,
    ContractFormData,
    ContractPackageSubmission,
    ContractRevision,
    Rate,
    RateRevision,
    UnlockedContract,
    ActuaryContact,
} from '../gen/gqlClient'
import {
    type ProgramArgType,
    typedStatePrograms,
} from '../statePrograms'
import {
    ActuaryFirmsRecord
} from './healthPlanFormDataConstants'

type RateRevisionWithIsLinked = {
    isLinked: boolean
} & RateRevision

// This function returns a revision with isLinked field as well manually calculated from parent rate
// There are cases where we need the revision itself to be able to track its own linked status, decontextualized from the parent rate or parent contract
function getVisibleLatestRateRevisions(
    contract: Contract | UnlockedContract,
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
                // LinkedRates are determined by comparing the rates parentContractID to the contract.id
                isLinked: rrev.rate
                    ? rrev.rate.parentContractID !== contract.id
                    : false,
            }
        })
    }
}

// returns draft form data for unlocked and draft, and last package submission data for submitted or resubmitted
// only state users get to see draft data.
const getVisibleLatestContractFormData = (
    contract: Contract | UnlockedContract | ContractRevision,
    isStateUser: boolean
): ContractFormData | undefined => {
    if (
        contract.__typename === 'Contract' ||
        contract.__typename === 'UnlockedContract'
    ) {
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
    contract: Contract | UnlockedContract
): ContractPackageSubmission | undefined => {
    return (
        (contract.packageSubmissions && contract.packageSubmissions[0]) ??
        undefined
    )
}

const getPackageSubmissionAtIndex = (
    contract: Contract | UnlockedContract,
    indx: number
): ContractPackageSubmission | undefined => {
    return contract.packageSubmissions[indx] ?? undefined
}
// revisionVersion is a integer used in the URLs for previous submission - numbering the submission in order from first submitted
const getIndexFromRevisionVersion = (
    contract: Contract | UnlockedContract,
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

const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, 'en', { numeric: true })
}

// Since these functions are in common code, we don't want to rely on the api or gql program types
// instead we create an interface with what is required for these functions, since both those types
// implement it, we can use it interchangeably
// Pull out the programs names for display from the program IDs
function programNames(
    programs: ProgramArgType[],
    programIDs: string[]
): string[] {
    return programIDs.map((id) => {
        const program = programs.find((p) => p.id === id)
        if (!program) {
            return 'Unknown Program'
        }
        return program.name
    })
}

function packageName(
    stateCode: string,
    stateNumber: number,
    programIDs: string[],
    statePrograms: ProgramArgType[]
): string {
    const padNumber = stateNumber.toString().padStart(4, '0')
    const pNames = programNames(statePrograms, programIDs)
    const formattedProgramNames = pNames
        .sort(naturalSort)
        .map((n) =>
            n
                .replace(/\s/g, '-')
                .replace(/[^a-zA-Z0-9+]/g, '')
                .toUpperCase()
        )
        .join('-')
    return `MCR-${stateCode.toUpperCase()}-${padNumber}-${formattedProgramNames}`
}

const formatContractSubmissionType = (contractSubmissionType: string): string => {
    const formattedString = contractSubmissionType === 'HEALTH_PLAN' ? 'health-plan' : 'eqro'
    return formattedString
}

const findStatePrograms = (stateCode: string): ProgramArgType[] => {
    const programs = typedStatePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        return []
    }
    return programs
}


export {
    getDraftRates,
    getLastContractSubmission,
    getVisibleLatestContractFormData,
    getVisibleLatestRateRevisions,
    getActuaryFirm,
    getPackageSubmissionAtIndex,
    getIndexFromRevisionVersion,
    findStatePrograms,
    packageName,
    programNames,
    naturalSort,
    formatContractSubmissionType
}
export type { RateRevisionWithIsLinked }
