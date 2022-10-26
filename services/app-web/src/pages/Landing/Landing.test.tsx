import { screen } from '@testing-library/react'
import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { Landing } from './Landing'

describe('Landing', () => {
    afterAll(() => jest.clearAllMocks())

    it('displays maintenance banner when flag is on', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': true })
        renderWithProviders(<Landing />)
        expect(
            await screen.findByRole('heading', { name: 'Site unavailable' })
        ).toBeInTheDocument()
        expect(
            await screen.findByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeInTheDocument()
    })

    it('does not display maintenance banner when flag is off', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        renderWithProviders(<Landing />)
        expect(
            await screen.queryByRole('heading', { name: 'Site Unavailable' })
        ).toBeNull()
        expect(
            await screen.queryByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeNull()
    })

    it('displays session expired when query parameter included', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/?session-timeout' },
        })
        expect(
            await screen.queryByRole('heading', { name: 'Session expired' })
        ).toBeNull()
        expect(
            await screen.queryByText(
                /You have been logged out due to inactivity/
            )
        ).toBeNull()
    })
    it('does not display session expired by default', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/' },
        })
        expect(
            await screen.queryByRole('heading', {
                name: 'Session expired',
            })
        ).toBeNull()
        expect(
            await screen.queryByText(
                /You have been logged out due to inactivity/
            )
        ).toBeNull()
    })
})
