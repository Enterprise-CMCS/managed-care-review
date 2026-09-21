export const contractLinkedRateScenarioKey = 'contract-linked-rate-v1'

export type ContractLinkedRateRole = 'source' | 'linked'

export function contractLinkedRateMarker(
    seed: string,
    role: ContractLinkedRateRole
): string {
    return `[SYNTHETIC:${contractLinkedRateScenarioKey}:${role}:${seed}]`
}
