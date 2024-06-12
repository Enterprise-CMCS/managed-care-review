import { loginLocalUser, getLoggedInUser, logoutLocalUser } from '.'
import { LocalUserType } from './LocalUserType'

describe('localLogin', () => {
    it('returns empty on empty', async () => {
        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('loads as expected', async () => {
        const testUser: LocalUserType = {
            id: 'foo-bar',
            email: 'toph@dmas.virginia.gov',
            givenName: 'Toph',
            familyName: 'Earth',
            role: 'STATE_USER',
            stateCode: 'VA',
        }

        loginLocalUser(testUser)

        await expect(getLoggedInUser()).resolves.toEqual(testUser)
    })

    it('logs out correctly', async () => {
        const testUser: LocalUserType = {
            id: 'foo-bar',
            email: 'toph@dmas.virginia.gov',
            givenName: 'Toph',
            familyName: 'Earth',
            role: 'STATE_USER',
            stateCode: 'VA',
        }

        loginLocalUser(testUser)
        await logoutLocalUser()

        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('errors if things are garbled', async () => {
        const store = window.localStorage

        // set non-JSON in local storage
        store.setItem('localUser', 'weofnef{{{|')

        await expect(getLoggedInUser()).rejects.toEqual(
            new SyntaxError(
                `Unexpected token 'w', "weofnef{{{|" is not valid JSON`
            )
        )
    })

    it('errors if the type is wrong', async () => {
        const store = window.localStorage
        // set a non-user in local storage
        store.setItem('localUser', '{"foo": "bar"}')

        await expect(getLoggedInUser()).rejects.toEqual(
            new Error('garbled user stored in localStorage')
        )
    })
})
