import { isCognitoUser, isCMSUser, isStateUser } from './'

describe('user type assertions', () => {
    it('isCognitoUser returns as expected', () => {
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toBe(true)
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'OTHER_OTHER_USER',
                state_code: 'IL',
            })
        ).toBe(false)
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
            })
        ).toBe(false)
    })

    it('isCMSUser returns as expected', () => {
        expect(
            isCMSUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toBe(true)
        expect(
            isCMSUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                state_code: 'IL',
            })
        ).toBe(false)
    })

    it('isStateUser returns as expected', () => {
        expect(
            isStateUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                state_code: 'IL',
            })
        ).toBe(true)
        expect(
            isStateUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toBe(false)
    })
})
