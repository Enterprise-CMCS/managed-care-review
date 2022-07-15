import { formatFormDateForDomain } from './formatters'

describe('formatFormDateForDomain', () => {
    it('should return the passed in date as a CalendarDate', () => {
        const date = '2020-01-01'
        const formattedDate = formatFormDateForDomain(date)
        expect(formattedDate).toEqual(date)
    })

    it('should return undefined if the passed in date is empty', () => {
        const date = ''
        const formattedDate = formatFormDateForDomain(date)
        expect(formattedDate).toBeUndefined()
    })
})
