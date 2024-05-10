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
                        {
                            id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            fullName: 'Special Needs Basic Care',
                            name: 'SNBC',
                            isRateProgram: false,
                        },
                        {
                            id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                            fullName: 'Prepaid Medical Assistance Program',
                            name: 'PMAP',
                            isRateProgram: false,
                        },
                        {
                            id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                            fullName: 'Minnesota Senior Care Plus ',
                            name: 'MSC+',
                            isRateProgram: false,
                        },
                        {
                            id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                            fullName: 'Minnesota Senior Health Options',
                            name: 'MSHO',
                            isRateProgram: false,
                        },
                    ],
                },
                id: 'foo-id',
                givenName: 'Bob',
                familyName: 'Dumas',
                role: 'State User',
                email: 'bob@dmas.mn.gov',
            },
            loginStatus: 'LOGGED_IN',
            checkAuth: () => Promise.reject(Error('Auth context error')),
            logout: () => Promise.resolve(),
            sessionIsExpiring: true,
            updateSessionExpirationState: () => void 0,
            logoutCountdownDuration: 120,
            sessionExpirationTime: { current: undefined },
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
