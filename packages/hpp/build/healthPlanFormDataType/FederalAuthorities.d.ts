declare const federalAuthorityKeys: readonly ["STATE_PLAN", "WAIVER_1915B", "WAIVER_1115", "VOLUNTARY", "BENCHMARK", "TITLE_XXI"];
declare const federalAuthorityKeysForCHIP: readonly ["WAIVER_1115", "TITLE_XXI"];
type FederalAuthority = (typeof federalAuthorityKeys)[number];
type CHIPFederalAuthority = (typeof federalAuthorityKeysForCHIP)[number];
export { federalAuthorityKeys, federalAuthorityKeysForCHIP };
export type { FederalAuthority, CHIPFederalAuthority };
