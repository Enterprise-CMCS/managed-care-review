import { formatFormDateForDomain } from './formatters'

describe('formatFormDateForDomain', () => {
    it('should return the passed in date as a date object in UTC', () => {
        const date = '2020-01-01'
        const formattedDate = formatFormDateForDomain(date)
        expect(formattedDate).toBeInstanceOf(Date)
        // Z as proxy for being in UTC
        expect(formattedDate?.toISOString()).toContain('Z')
    })

    it('should return undefined if the passed in date is empty', () => {
        const date = ''
        const formattedDate = formatFormDateForDomain(date)
        expect(formattedDate).toBeUndefined()
    })
})
