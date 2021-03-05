import { loginLocalUser, getLoggedInUser, logoutLocalUser } from './localLogin'
import { User as UserType } from '../../gen/gqlClient'

describe('localLogin', () => {
    it('returns empty on empty', async () => {
        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('loads as expected', async () => {
        const testUser: UserType = {
            email: 'toph@dmas.virginia.gov',
            name: 'Toph',
            role: 'STATE_USER',
            state: {
                name: 'Virginia',
                code: 'VA',
                programs: [{ name: 'CCC Plus' }, { name: 'Medallion' }],
            },
        }

        loginLocalUser(testUser)

        await expect(getLoggedInUser()).resolves.toEqual(testUser)
    })

    it('logs out correctly', async () => {
        const testUser: UserType = {
        email: 'toph@dmas.virginia.gov',
        name: 'Toph',
        role: 'STATE_USER',
        state: {
            name: 'Virginia',
            code: 'VA',
            programs: [{ name: 'CCC Plus' }, { name: 'Medallion' }],
        },
         }

        loginLocalUser(testUser)
        logoutLocalUser()

        await expect(getLoggedInUser()).resolves.toBeNull()
    })

    it('errors if things are garbled', async () => {
        const store = window.localStorage

        // set non-JSON in local storage
        store.setItem('localUser', 'weofnef{{{|')

       await  expect(getLoggedInUser()).rejects.toEqual(
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
