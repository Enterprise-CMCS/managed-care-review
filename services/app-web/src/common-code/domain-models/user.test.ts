import { isCognitoUser, isCMSUser, isStateUser } from './'

describe('user type assertions', () => {
    it('isCognitoUser returns as expected', () => {
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toEqual(true)
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'OTHER_OTHER_USER',
                state_code: 'IL',
            })
        ).toEqual(false)
        expect(
            isCognitoUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
            })
        ).toEqual(false)
    })

    it('isCMSUser returns as expected', () => {
        expect(
            isCMSUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toEqual(true)
        expect(
            isCMSUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                state_code: 'IL',
            })
        ).toEqual(false)
    })

    it('isStateUser returns as expected', () => {
        expect(
            isStateUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'STATE_USER',
                state_code: 'IL',
            })
        ).toEqual(true)
        expect(
            isStateUser({
                name: 'Margaret',
                email: 'burroughs@dusable.org',
                role: 'CMS_USER',
            })
        ).toEqual(false)
    })
})
