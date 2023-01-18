import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { UserLoginInfo } from './UserLoginInfo'

describe('UserLoginInfo', () => {
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
        const jestFn = jest.fn()

        renderWithProviders(
            <UserLoginInfo
                user={undefined}
                loginStatus={'LOGGED_OUT'}
                authMode={'LOCAL'}
                logout={jestFn}
            />
        )
        expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('renders a username', () => {
        const jestFn = jest.fn()

        renderWithProviders(
            <UserLoginInfo
                user={loggedInUser}
                loginStatus={'LOGGED_IN'}
                authMode={'LOCAL'}
                logout={jestFn}
            />
        )
        expect(screen.getByRole('button')).toBeInTheDocument()
        expect(screen.getByText('bob@dmas.mn.gov')).toBeInTheDocument()
    })

    it('renders submit feedback link', () => {
        const jestFn = jest.fn()

        renderWithProviders(
            <UserLoginInfo
                user={loggedInUser}
                loginStatus={'LOGGED_IN'}
                authMode={'LOCAL'}
                logout={jestFn}
            />
        )
        const feedbackLink = screen.getByRole('link', {
            name: /Submit feedback/i,
        })
        expect(feedbackLink).toHaveAttribute(
            'href',
            'mailto: mc-review@cms.hhs.gov, mc-review-team@truss.works'
        )
    })

    it('displays nothing while loading', () => {
        const jestFn = jest.fn()

        renderWithProviders(
            <UserLoginInfo
                user={undefined}
                loginStatus={'LOADING'}
                authMode={'LOCAL'}
                logout={jestFn}
            />
        )
        expect(screen.queryByRole('button')).toBeNull()
        expect(screen.queryByRole('link')).toBeNull()
    })
})
