import type { UploadedDocument } from '../client/uploadClient'
import type { ContractDraftRevisionFormDataInput } from '../gen/gqlClient'
import { buildSyntheticContractFormData } from './contractSmoke'

export const contractUnlockResubmitScenarioKey = 'contract-unlock-resubmit-v1'
export const contractUnlockReason =
    'Synthetic scenario: revise contract provisions and documents'
export const contractResubmitReason =
    'Synthetic scenario: resubmit revised contract'

export function contractUnlockResubmitMarker(
    seed: string,
    revision: 'initial' | 'resubmitted'
): string {
    return `[SYNTHETIC:${contractUnlockResubmitScenarioKey}:${revision}:${seed}]`
}

export function buildResubmittedContractFormData(
    seed: string,
    programId: string,
    contractDocument: UploadedDocument,
    supportingDocument: UploadedDocument
): ContractDraftRevisionFormDataInput {
    return {
        ...buildSyntheticContractFormData(
            contractUnlockResubmitMarker(seed, 'resubmitted'),
            programId,
            contractDocument,
            [supportingDocument]
        ),
        modifiedBenefitsProvided: false,
        modifiedGeoAreaServed: false,
        statutoryRegulatoryAttestationDescription:
            'Synthetic revised submission remains outside attestation',
    }
}
