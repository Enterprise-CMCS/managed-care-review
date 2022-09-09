import { screen, render } from '@testing-library/react'
import { ldUseClientSpy } from '../../testHelpers/jestHelpers'
import { Landing } from './Landing'

describe('Landing', () => {
    it('displays maintenance banner when flag is on', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': true })
        render(<Landing />)
        expect(
            await screen.findByRole('heading', { name: 'Site Unavailable' })
        ).toBeInTheDocument()
        expect(
            await screen.findByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeInTheDocument()
    })

    it('does not display maintenance banner when flag is off', async () => {
        ldUseClientSpy({ 'site-maintenance-banner': false })
        render(<Landing />)
        expect(
            await screen.queryByRole('heading', { name: 'Site Unavailable' })
        ).toBeNull()
        expect(
            await screen.queryByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeNull()
    })
})
