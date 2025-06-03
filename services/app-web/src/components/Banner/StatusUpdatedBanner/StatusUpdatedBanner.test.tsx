import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { StatusUpdatedBanner } from './StatusUpdatedBanner'

test('renders status updated banner with no errors', () => {
    renderWithProviders(<StatusUpdatedBanner />)

    expect(screen.getByTestId('statusUpdatedBanner')).toBeInTheDocument()
    expect(screen.getByText('Status updated')).toBeInTheDocument()
    expect(
        screen.getByText('Submission status updated to "Submitted".')
    ).toBeInTheDocument()
})
