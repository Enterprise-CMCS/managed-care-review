import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { Landing } from './Landing'
import { LOGOUT_PATHS } from '../../contexts/AuthContext'

describe('Landing', () => {
    afterAll(() => vi.clearAllMocks())

    it('displays session expired when query parameter included', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: LOGOUT_PATHS.TIMEOUT },
            featureFlags: {
                'site-under-maintenance-banner': false,
            },
        })
        expect(
            screen.queryByRole('heading', { name: 'Session expired' })
        ).toBeDefined()
        expect(
            screen.queryByText(/You have been logged out due to inactivity/)
        ).toBeDefined()
        expect(
            screen.queryByRole('heading', { name: 'Sign in error' })
        ).toBeNull()
    })

    it('displays signin error when query parameter included', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/?signin-error' },
            featureFlags: {
                'site-under-maintenance-banner': false,
            },
        })
        expect(
            screen.queryByRole('heading', { name: 'Sign in error' })
        ).toBeDefined()
        expect(
            screen.queryByText(/There has been an error signing in/)
        ).toBeDefined()
        expect(
            screen.queryByRole('heading', { name: 'Session expired' })
        ).toBeNull()
    })

    it('does not display session expired by default', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/' },
            featureFlags: {
                'site-under-maintenance-banner': false,
            },
        })
        expect(
            screen.queryByRole('heading', {
                name: 'Session expired',
            })
        ).toBeNull()
        expect(
            screen.queryByText(/You have been logged out due to inactivity/)
        ).toBeNull()
    })
})
