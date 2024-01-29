import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { Landing } from './Landing'

describe('Landing', () => {
    afterAll(() => jest.clearAllMocks())

    it('displays session expired when query parameter included', async () => {
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/?session-timeout' },
            featureFlags: {
                'site-under-maintenance-banner': false,
            },
        })
        expect(
            screen.queryByRole('heading', { name: 'Session expired' })
        ).toBeNull()
        expect(
            screen.queryByText(/You have been logged out due to inactivity/)
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
