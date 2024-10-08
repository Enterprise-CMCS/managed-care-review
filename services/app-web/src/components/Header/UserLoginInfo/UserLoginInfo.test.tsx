import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { UserLoginInfo } from './UserLoginInfo'
import { useStringConstants } from '../../../hooks/useStringConstants'

describe('UserLoginInfo', () => {
    afterEach(() => vi.clearAllMocks())
    const loggedInUser = {
        state: {
            name: 'Minnesota',
            code: 'MN',
            programs: [
                { id: 'msho', name: 'MSHO' },
                { id: 'pmap', name: 'PMAP' },
                { id: 'snbc', name: 'SNBC' },
            ],
        },
        id: 'foo-id',
        givenName: 'Bob',
        familyName: 'Dumas',
        role: 'State User',
        email: 'bob@dmas.mn.gov',
    }
    it('renders without errors', () => {
        const jestFn = vi.fn()

        renderWithProviders(
            <UserLoginInfo
                user={undefined}
                loginStatus={'LOGGED_OUT'}
                authMode={'LOCAL'}
                logout={jestFn}
                disableLogin={false}
            />
        )
        expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('renders a username', () => {
        const jestFn = vi.fn()

        renderWithProviders(
            <UserLoginInfo
                user={loggedInUser}
                loginStatus={'LOGGED_IN'}
                authMode={'LOCAL'}
                logout={jestFn}
                disableLogin={false}
            />
        )
        expect(screen.getByRole('button')).toBeInTheDocument()
        expect(screen.getByText('bob@dmas.mn.gov')).toBeInTheDocument()
    })

    it('renders link to support email', () => {
        const stringConstants = useStringConstants()
        const jestFn = vi.fn()

        renderWithProviders(
            <UserLoginInfo
                user={loggedInUser}
                loginStatus={'LOGGED_IN'}
                authMode={'LOCAL'}
                logout={jestFn}
                disableLogin={false}
            />
        )
        const feedbackLink = screen.getByRole('link', {
            name: `${stringConstants.MAIL_TO_SUPPORT}`,
        })
        expect(feedbackLink).toHaveAttribute(
            'href',
            stringConstants.MAIL_TO_SUPPORT_HREF
        )
    })

    it('displays nothing while loading', () => {
        const jestFn = vi.fn()

        renderWithProviders(
            <UserLoginInfo
                user={undefined}
                loginStatus={'LOADING'}
                authMode={'LOCAL'}
                logout={jestFn}
                disableLogin={false}
            />
        )
        expect(screen.queryByRole('button')).toBeNull()
        expect(screen.queryByRole('link')).toBeNull()
    })

    it('displays nothing when disabled', () => {
        const jestFn = vi.fn()

        renderWithProviders(
            <UserLoginInfo
                user={undefined}
                loginStatus={'LOGGED_OUT'}
                authMode={'LOCAL'}
                logout={jestFn}
                disableLogin={true}
            />
        )
        expect(screen.queryByRole('button')).toBeNull()
        expect(screen.queryByRole('link')).toBeNull()
    })
})
