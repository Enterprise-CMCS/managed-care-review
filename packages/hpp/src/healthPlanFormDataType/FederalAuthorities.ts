const federalAuthorityKeys = [
    'STATE_PLAN',
    'WAIVER_1915B',
    'WAIVER_1115',
    'VOLUNTARY',
    'BENCHMARK',
    'TITLE_XXI',
] as const

const federalAuthorityKeysForCHIP = ['WAIVER_1115', 'TITLE_XXI'] as const

type FederalAuthority = (typeof federalAuthorityKeys)[number]

type CHIPFederalAuthority = (typeof federalAuthorityKeysForCHIP)[number]

export { federalAuthorityKeys, federalAuthorityKeysForCHIP }
export type { FederalAuthority, CHIPFederalAuthority }
