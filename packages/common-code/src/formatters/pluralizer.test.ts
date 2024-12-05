import { pluralize } from './'

describe('pluralize', () => {
    it("pluralizes 'do' and 'does'", () => {
        expect(pluralize('do', 1)).toBe('does')
        expect(pluralize('do', 2)).toBe('do')
        expect(pluralize('does', 2)).toBe('do')
    })
    it('pluralizes regular plurals correctly', () => {
        expect(pluralize('goat', 1)).toBe('goat')
        expect(pluralize('goat', 2)).toBe('goats')
    })
      it('pluralizes zero correctly', () => {
        expect(`I have no ${pluralize('goat', 0)}`).toBe('I have no goats')
        expect(`0 ${pluralize('file', 0)} added`).toBe('0 files added')
      })
})
