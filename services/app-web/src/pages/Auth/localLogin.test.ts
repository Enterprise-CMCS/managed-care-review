import { loginLocalUser, getLoggedInUser, logoutLocalUser } from './localLogin'
import { User } from '../../../../domain-models/user'

describe('localLogin', () => {
    it('returns empty on empty', async () => {
        return getLoggedInUser()
            .then((user) => {
                expect(user).toBeNull()
            })
            .catch(() => {
                throw new Error('empty store should work')
            })
    })

    it('loads as expected', async () => {
        const testUser: User = {
            role: 'STATE_USER',
            name: 'foobar',
            email: 'bar@baz.bim',
            state: 'TN',
        }

        loginLocalUser(testUser)

        try {
            const user = await getLoggedInUser()
            expect(user).toEqual(testUser)
        } catch (e) {
            throw e
        }
    })

    it('logs out correctly', async () => {
        const testUser: User = {
            role: 'STATE_USER',
            name: 'foobar',
            email: 'bar@baz.bim',
            state: 'TN',
        }

        loginLocalUser(testUser)
        logoutLocalUser()

        try {
            const user = await getLoggedInUser()
            expect(user).toEqual(null)
        } catch (e) {
            throw e
        }
    })

    it('errors if things are garbled', async () => {
        const store = window.localStorage

        // set non-JSON in local storage
        store.setItem('localUser', 'weofnef{{{|')

        try {
            await getLoggedInUser()
            throw new Error('this should throw')
        } catch (e) {
            expect(e.name).toBe('SyntaxError')
        }
    })

    it('errors if the type is wrong', async () => {
        const store = window.localStorage
        // set a non-user in local storage
        store.setItem('localUser', '{"foo": "bar"}')

        try {
            await getLoggedInUser()
            throw new Error('this should throw')
        } catch (e) {
            expect(e.message).toBe('garbled user stored in localStorage')
        }
    })
})
