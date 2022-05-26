import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'
import * as AuthContext from '../../contexts/AuthContext'

describe('AuthenticatedRouteWrapper', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="LOCAL"
                children={<div>children go here</div>}
            />
        )
        const kids = await screen.findByText('children go here')
        expect(kids).toBeInTheDocument()
    })

    it('hides the modal by default', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="LOCAL"
                children={<div>children go here</div>}
            />
        )
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-hidden'))
    })

    it('shows the modal when sessionIsExpiring is true', async () => {
        jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
            loggedInUser: {
                __typename: 'StateUser' as const,
                state: {
                    name: 'Minnesota',
                    code: 'MN',
                    programs: [
                        { id: 'msho', name: 'MSHO' },
                        { id: 'pmap', name: 'PMAP' },
                        { id: 'snbc', name: 'SNBC' },
                    ],
                },
                role: 'State User',
                name: 'Bob it user',
                email: 'bob@dmas.mn.gov',
            },
            loginStatus: 'LOGGED_IN',
            checkAuth: () => Promise.reject(Error('Auth context error')),
            logout: () => Promise.resolve(),
            sessionIsExpiring: true,
            updateSessionExpirationState: () => void 0,
            logoutCountdownDuration: 120,
            logoutTime: undefined,
            updateSessionExpirationTime: () => void 0,
            checkIfSessionsIsAboutToExpire: () => void 0,
            setLogoutCountdownDuration: () => void 0,
        })
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="LOCAL"
                children={<div>children go here</div>}
            />
        )
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-visible'))
    })
})
