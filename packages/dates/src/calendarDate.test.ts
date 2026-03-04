import { isValidDateString } from './calendarDate'

// testing function isValidDateString
// returns true only if user enters date in '01/01/2026' or '1/1/2026' formats
// also returns false for 'impossible dates' like '09/31/2026'

describe('isValidDateString', () => {
    describe('empty entry', () => {
        it('returns false for empty string', () => {
            expect(isValidDateString('')).toBe(false)
        })
    })

    describe('internal format YYYY-MM-DD', () => {
        it.each([
            [true, '2026-08-09', 'valid internal format'],
            [false, '2026-13-01', 'impossible date - month 13'],
            [false, '2026-02-29','impossible date - Feb 29 non-leap year'],
        ])('returns %s for %s: %s', (expected, value, description) => {
            expect(isValidDateString(value as string)).toBe(expected)
        })
    })

    describe('user input MM/DD/YYYY or M/D/YYYY format', () => {
        it.each([
            [true, '05/05/2026', 'valid date with leading zeros'],
            [true, '5/5/2026', 'valid date without leading zeros'],
        ])('returns %s for %s: %s', (expected, value, description) => {
            expect(isValidDateString(value as string)).toBe(expected)
        })
    })

    describe('partial and malformed entries', () => {
        it.each([
            [false, '05/05', 'missing year with leading zeros'],
            [false, '5/5', 'missing year without leading zeros'],
            [false, '05/05/', 'trailing slash with leading zeros'],
            [false, '5/5/', 'trailing slash without leading zeros'],
            [false, '05/05/20', 'partial year with leading zeros'],
            [false, '5/5/20', 'partial year without leading zeros'],
            [false, '05//2026', 'missing day with leading zeros'],
            [false, '5//2026', 'missing day without leading zeros'],
            [false, '/05/2026', 'missing month with leading zeros'],
            [false, '/5/2026', 'missing month without leading zeros'],
            [false, '05-05-2026', 'wrong separator with leading zeros'],
            [false, '5-5-2026', 'wrong separator without leading zeros'],
            [false, 'abra-kadabra', 'text input'],
        ])('returns %s for %s: %s', (expected, value, description) => {
            expect(isValidDateString(value as string)).toBe(expected)
        })
    })

    describe('leap year', () => {
        it.each([
            [true, '2/29/2024', 'Feb 29 on leap year'],
            [false, '2/29/2026', 'Feb 29 on non-leap year'],
        ])('returns %s for %s: %s', (expected, value, description) => {
            expect(isValidDateString(value as string)).toBe(expected)
        })
    })

    describe('impossible dates', () => {
        it.each([
            [false, '13/01/2026', 'month 13'],
            [false, '1/32/2026', 'day 32'],
            [false, '9/31/2026', 'September 31'],
            [false, '1/0/2026', 'day 0'],
            [false, '0/1/2026', 'month 0'],
        ])('returns %s for %s: %s', (expected, value, description) => {
            expect(isValidDateString(value as string)).toBe(expected)
        })
    })
})
