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

    it('displays ILOS content when ilos-submissions flag is on', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/' },
            featureFlags: {
                'eqro-submissions': true,
                'ilos-submissions': true,
            },
        })
        expect(
            await screen.findByRole('heading', {
                name: 'Submit your managed care contracts and documents to CMS for review',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(/In Lieu of Services \(ILOS\) actuarial reports/)
        ).toBeInTheDocument()
    })

    it('hides ILOS content when ilos-submissions flag is off', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/' },
            featureFlags: {
                'eqro-submissions': true,
                'ilos-submissions': false,
            },
        })
        expect(
            await screen.findByRole('heading', {
                name: 'Submit your managed care contracts to CMS for review',
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByText(/In Lieu of Services \(ILOS\) actuarial reports/)
        ).toBeNull()
    })
})
