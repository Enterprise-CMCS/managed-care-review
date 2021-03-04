import { loginLocalUser, getLoggedInUser, logoutLocalUser } from './localLogin'
import { UserType } from '../../common-code/domain-models/user'

describe('localLogin', () => {
    it('returns empty on empty', async () => {
        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('loads as expected', async () => {
        const testUser: UserType = {
            role: 'STATE_USER',
            name: 'foobar',
            email: 'bar@baz.bim',
            state: 'TN',
        }

        loginLocalUser(testUser)

        await expect(getLoggedInUser()).resolves.toEqual(testUser)
    })

    it('logs out correctly', async () => {
        const testUser: UserType = {
            role: 'STATE_USER',
            name: 'foobar',
            email: 'bar@baz.bim',
            state: 'TN',
        }

        loginLocalUser(testUser)
        logoutLocalUser()

        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('errors if things are garbled', async () => {
        const store = window.localStorage

        // set non-JSON in local storage
        store.setItem('localUser', 'weofnef{{{|')

        await expect(getLoggedInUser()).rejects.toEqual(
            new SyntaxError('Unexpected token w in JSON at position 0')
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
