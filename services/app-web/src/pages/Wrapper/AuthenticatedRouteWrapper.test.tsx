import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'

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
})
