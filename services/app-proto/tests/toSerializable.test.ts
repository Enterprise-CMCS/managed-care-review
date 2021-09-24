import { toSerializable } from '../src/helpers'

describe('toSerializable', () => {
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
        contractAmendmenttInfo: {
            itemsBeingAmended: ['INVALID_ENUM', 'OTHER'],
            otherItemBeingAmended: 'This is why items amended',
            relatedToCovid19: 'a boolean',
        },
    }

    // test.each([
    //     [validDomain1, JSON.stringify(validDomain1)],
    //     [validDomain2, JSON.stringify(validDomain2)],
    // ])('given valid domain model %j expect %o)', (domainObject, expected) => {
    //     expect(toSerializable(domainObject)).toBe(expected)
    // })

    test.each([[invalidDomain1]])(
        'given invalid object %o expect error)',
        (invalidDomainObject) => {
            expect(toSerializable(invalidDomainObject)).toThrowError()
        }
    )
})
