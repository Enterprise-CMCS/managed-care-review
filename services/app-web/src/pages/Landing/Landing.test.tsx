import { screen } from '@testing-library/react'
import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { Landing } from './Landing'

describe('Landing', () => {
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

    it('displays signin error alert when query parameter included', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/?session-timeout' },
        })
        expect(
            await screen.queryByRole('heading', { name: 'Sign in error' })
        ).toBeNull()
        expect(
            await screen.queryByText(/There has been a problem signing in/)
        ).toBeNull()
    })
    it('does not display signin error alert by default', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        renderWithProviders(<Landing />, {
            routerProvider: { route: '/' },
        })
        expect(
            await screen.queryByRole('heading', {
                name: 'Sign in error',
            })
        ).toBeNull()
        expect(
            await screen.queryByText(/There has been a problem signing in/)
        ).toBeNull()
    })
})
