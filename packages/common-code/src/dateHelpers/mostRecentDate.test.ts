import { mostRecentDate } from './'

describe('mostRecentDate', () => {
    const timeNow = new Date()
    const timeABitLater = new Date()
    const may1998 = new Date('1998-05-01')
    const jan2100 = new Date('2100-01-01')

    test.each([
        [[may1998, new Date('1998-01-15'), new Date('1998-02-01')], may1998],
        [
            [may1998, undefined, jan2100, new Date('1998-02-01'), undefined],
            jan2100,
        ],
        [
            [
                may1998,
                timeNow,
                new Date('1998-01-15'),
                timeABitLater,
                undefined,
            ],
            timeNow,
        ],
        [[undefined, undefined, undefined], undefined],
    ])(
        'given %p as dates array, returns the date %p',
        (dates, expectedResult) => {
            expect(mostRecentDate(dates)).toEqual(expectedResult)
        }
    )
})
