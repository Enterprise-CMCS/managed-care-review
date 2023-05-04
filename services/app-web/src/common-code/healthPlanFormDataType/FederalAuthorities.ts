const federalAuthorityKeys = [ 
    'STATE_PLAN'
    ,'WAIVER_1915B'
    ,'WAIVER_1115'
    ,'VOLUNTARY'
    ,'BENCHMARK'
    ,'TITLE_XXI'
] as const

const federalAuthorityKeysForCHIP = [ 
    'STATE_PLAN'
    ,'WAIVER_1915B'
    ,'VOLUNTARY'
    ,'BENCHMARK'
] as const

type FederalAuthority = (typeof federalAuthorityKeys)[number]

type CHIPFederalAuthority = (typeof federalAuthorityKeysForCHIP)[number]

export {federalAuthorityKeys, federalAuthorityKeysForCHIP}
export type { FederalAuthority, CHIPFederalAuthority}