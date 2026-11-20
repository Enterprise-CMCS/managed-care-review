import { repositionDraftRates } from './repositionDraftRates'

describe('repositionDraftRates', () => {
    const contractID = 'contract-1'
    const externalOne = { id: 'ext-1', rateControlName: 'EXT-1' }
    const externalTwo = { id: 'ext-2', rateControlName: 'EXT-2' }
    const formData = { rateCertificationName: 'child rate' }
    const childRate = (id: string, ratePosition?: number) => ({
        id,
        parentContractID: contractID,
        ratePosition,
        draftRevision: { formData },
    })
    const linkedRate = (id: string, ratePosition?: number) => ({
        id,
        parentContractID: 'other-contract',
        ratePosition,
    })

    it.each([
        {
            name: 'child and linked rates with a gap',
            rates: [childRate('rate-a', 1), linkedRate('rate-c', 3)],
            externalRates: [],
            expected: {
                update: [{ rateID: 'rate-a', formData, ratePosition: 1 }],
                link: [{ rateID: 'rate-c', ratePosition: 2 }],
                external: undefined,
            },
        },
        {
            name: 'linked and external rates with gaps',
            rates: [linkedRate('rate-b', 6), linkedRate('rate-a', 2)],
            externalRates: [
                { ...externalTwo, position: 4 },
                { ...externalOne, position: 1 },
            ],
            expected: {
                update: [],
                link: [
                    { rateID: 'rate-a', ratePosition: 2 },
                    { rateID: 'rate-b', ratePosition: 4 },
                ],
                external: [
                    { ...externalOne, position: 1 },
                    { ...externalTwo, position: 3 },
                ],
            },
        },
        {
            name: 'a rate with no position after every other rate',
            rates: [linkedRate('rate-new'), linkedRate('rate-a', 1)],
            externalRates: [{ ...externalOne, position: 2 }],
            expected: {
                update: [],
                link: [
                    { rateID: 'rate-a', ratePosition: 1 },
                    { rateID: 'rate-new', ratePosition: 3 },
                ],
                external: [{ ...externalOne, position: 2 }],
            },
        },
        {
            name: 'external rates only',
            rates: [],
            externalRates: [
                { ...externalOne, position: 1 },
                { ...externalTwo, position: 3 },
            ],
            expected: {
                update: [],
                link: [],
                external: [
                    { ...externalOne, position: 1 },
                    { ...externalTwo, position: 2 },
                ],
            },
        },
        {
            name: 'no rates',
            rates: [],
            externalRates: [],
            expected: { update: [], link: [], external: undefined },
        },
    ])('numbers $name 1 to n', ({ rates, externalRates, expected }) => {
        expect(repositionDraftRates(contractID, rates, externalRates)).toEqual(
            expected
        )
    })

    it('throws when a child rate has no draft revision', () => {
        expect(() =>
            repositionDraftRates(contractID, [
                { id: 'rate-a', parentContractID: contractID, ratePosition: 1 },
            ])
        ).toThrow('Draft rate rate-a is missing draft revision')
    })
})
