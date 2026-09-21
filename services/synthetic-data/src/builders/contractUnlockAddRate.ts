import type { UploadedDocument } from '../client/uploadClient'
import type { ContractDraftRevisionFormDataInput } from '../gen/gqlClient'
import { buildSyntheticContractFormData } from './contractSmoke'

export const contractUnlockAddRateScenarioKey = 'contract-unlock-add-rate-v1'
export const contractUnlockAddRateReason =
    'Synthetic scenario: add a rate to an unlocked contract'
export const contractAddRateResubmitReason =
    'Synthetic scenario: resubmit contract with a new rate'

export function contractUnlockAddRateMarker(
    seed: string,
    revision: 'initial' | 'resubmitted'
): string {
    return `[SYNTHETIC:${contractUnlockAddRateScenarioKey}:${revision}:${seed}]`
}

/**
 * Converts the unlocked contract-only revision into a complete contract-and-rates
 * revision while retaining the document originally submitted with the contract.
 */
export function buildContractWithAddedRateFormData(
    seed: string,
    programId: string,
    contractDocument: UploadedDocument
): ContractDraftRevisionFormDataInput {
    return {
        ...buildSyntheticContractFormData(
            contractUnlockAddRateMarker(seed, 'resubmitted'),
            programId,
            contractDocument
        ),
        submissionType: 'CONTRACT_AND_RATES',
    }
}
