import { isUser, isCMSUser, isStateUser } from './'

describe('user type assertions', () => {
    it('isUser returns as expected', () => {
        expect(
            isUser({
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toBe(true)
        expect(
            isUser({
                email: 'burroughs@dusable.org',
                role: 'OTHER_OTHER_USER',
                stateCode: 'IL',
            })
        ).toBe(false)
        expect(
            isUser({
                email: 'burroughs@dusable.org',
            })
        ).toBe(false)
    })

    it('isCMSUser returns as expected', () => {
        expect(
            isCMSUser({
                id: '2df24781-409c-4c3a-a044-398e7cde3c32',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
                givenName: 'Margaret',
                familyName: 'Burroughs',
            })
        ).toBe(true)
        expect(
            isCMSUser({
                id: '2df24781-409c-4c3a-a044-398e7cde3c32',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                stateCode: 'IL',
                givenName: 'Margaret',
                familyName: 'Burroughs',
            })
        ).toBe(false)
    })

    it('isStateUser returns as expected', () => {
        expect(
            isStateUser({
                id: '80a23f24-b185-4609-b195-dfde95103691',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                stateCode: 'IL',
                givenName: 'Margaret',
                familyName: 'Burroughs',
            })
        ).toBe(true)
        expect(
            isStateUser({
                id: '80a23f24-b185-4609-b195-dfde95103691',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
                givenName: 'Margaret',
                familyName: 'Burroughs',
            })
        ).toBe(false)
    })
})
