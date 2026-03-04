import { isValidDateString } from "./calendarDate"

// testing function isValidDateString
// returns true only if user enters date in '01/01/2026' or '1/1/2026' formats
// also returns false for 'impossible dates' like '09/31/2026'

describe('isValidDateString', () => {
    describe('empty entry', () => {
        it('returns false for empty string', () => {
            expect(isValidDateString('')).toBe(false)
        })
    })

    describe('internal format YYYY-MM-DD ', () => {
        it('returns true for valid internal format', () => {
            expect(isValidDateString('2026-08-09')).toBe(true)
        })
        it('returns false for impossible date in internal format. Month 13', () => {
            expect(isValidDateString('2026-13-01')).toBe(false) 
        })
        it('returns false for impossible date in internal format. Feb 29, non-leap year', () => {
            expect(isValidDateString('2026-02-29')).toBe(false)
        })
    })

    describe('user input MM/DD/YYYY or M/D/YYYY format', () => {
        it('returns true for valid date with leading zeros', () => {
            expect(isValidDateString('05/05/2026')).toBe(true)
        })
        it('returns true for valid date without leading zeros', () => {
            expect(isValidDateString('5/5/2026')).toBe(true)
        })
    })

    describe('partial and malformed entries', () => {
        it('returns false for missing year with leading zeros', () => {
            expect(isValidDateString('05/05')).toBe(false)
        })
        it('returns false for missing year without leading zeros', () => {
            expect(isValidDateString('5/5')).toBe(false)
        })
        it('returns false for trailing slash with leading zeros', () => {
            expect(isValidDateString('05/05/')).toBe(false)
        })
        it('returns false for trailing slash without leading zeros', () => {
            expect(isValidDateString('5/5/')).toBe(false)
        })
        it('returns false for partial year with leading zeros', () => {
            expect(isValidDateString('05/05/20')).toBe(false)
        })
        it('returns false for partial year without leading zeros', () => {
            expect(isValidDateString('5/5/20')).toBe(false)
        })
        it('returns false for missing day with leading zeros', () => {
            expect(isValidDateString('05//2026')).toBe(false)
        })
        it('returns false for missing day without leading zeros', () => {
            expect(isValidDateString('5//2026')).toBe(false)
        })
        it('returns false for missing month with leading zeros', () => {
            expect(isValidDateString('/5/2026')).toBe(false)
        })
        it('returns false for missing month with leading zeros', () => {
            expect(isValidDateString('/05/2026')).toBe(false)
        })
        it('returns false for wrong separator without leading zeros', () => {
            expect(isValidDateString('05-05-2026')).toBe(false)
        })
        it('returns false for wrong separator without leading zeros', () => {
            expect(isValidDateString('5-5-2026')).toBe(false)
        })
        it('returns false for text input', () => {
            expect(isValidDateString('abra-kadabra')).toBe(false)
        })
    })

    describe('leap year', () => {
        it('returns true for leap year Feb 29', () => {
            expect(isValidDateString('2/29/2024')).toBe(true) 
        })
        it('returns false for non-leap year Feb 29', () => {
            expect(isValidDateString('2/29/2026')).toBe(false)
        })
    })

    describe('impossible dates', () => {
        it('returns false for month 13', () => {
            expect(isValidDateString('13/01/2026')).toBe(false)
        })
        it('returns false for day 32', () => {
            expect(isValidDateString('1/32/2026')).toBe(false)
        })
        it('returns false for September 31', () => {
            expect(isValidDateString('9/31/2026')).toBe(false)
        })
        it('returns false for day 0', () => {
            expect(isValidDateString('1/0/2026')).toBe(false)
        })
        it('returns false for month 0', () => {
            expect(isValidDateString('0/1/2026')).toBe(false)
        })
    })


})