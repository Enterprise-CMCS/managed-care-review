import { formatContractSubTypeForDisplay } from "./formatContractSubTypeForDisplay";

describe('formatContractSubTypeForDisplay', () => {
  it('returns expected string according to provided contractSubmissionType', () => {
    expect(formatContractSubTypeForDisplay('HEALTH_PLAN')).toBe('Health plan')
    expect(formatContractSubTypeForDisplay('EQRO')).toBe('EQRO')
  })
})