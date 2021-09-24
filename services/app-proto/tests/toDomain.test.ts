import { toDomain } from '../src/helpers'

describe('toDomain', () => {
    const validDomain1 = {
        contractAmendmentInfo: {
            itemsBeingAmended: [
                'BENEFITS_PROVIDED',
                'CAPITATION_RATES',
                'ENROLLEE_ACCESS',
                'OTHER',
            ],
            otherItemBeingAmended: 'This is why items amended',
            capitationRatesAmendedInfo: {
                reason: 'OTHER',
                otherReason: 'This is capitation rates info',
            },
            relatedToCovid19: false,
            relatedToVaccination: false,
        },
    }

    const validDomain2 = {
        contractAmendmentInfo: {
            itemsBeingAmended: ['BENEFITS_PROVIDED'],
            relatedToCovid19: false,
        },
    }

    const invalidDomain1 = {
        contractAmendmentInfo: {
            itemsBeingAmended: ['INVALID_ENUM', 'OTHER'],
            otherItemBeingAmended: 'This is why items amended',
            relatedToCovid19: 'a boolean',
        },
    }

    test.each([
        [JSON.stringify(validDomain1), validDomain1],
        [JSON.stringify(validDomain1), validDomain2],
    ])('given valid domain model expect %o)', (serialized, expected) => {
        expect(toDomain(serialized)).toBe(expected)
    })
})
