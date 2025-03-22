import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { WithdrawSubmissionBanner } from './WithdrawSubmissionBanner'

test('renders submission withdraw warning banner without errors', () => {
    renderWithProviders(<WithdrawSubmissionBanner />)

    expect(screen.getByTestId('withdrawSubmissionBanner')).toBeInTheDocument()
    expect(
        screen.getByText(
            'Rates on multiple contract actions will not be withdrawn'
        )
    ).toBeInTheDocument()
    expect(
        screen.getByText(
            'This contract action has rates on multiple contract actions.'
        )
    ).toBeInTheDocument()
})
