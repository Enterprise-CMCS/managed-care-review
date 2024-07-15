import { screen } from '@testing-library/react'
import { ErrorSummary } from './ErrorSummary'
import { renderWithProviders } from '../../../testHelpers'

describe('ErrorSummary component', () => {
    afterAll(() => {
        vi.clearAllMocks()
    })

    it('renders nothing when errors is empty', () => {
        renderWithProviders(<ErrorSummary errors={{}} />)

        expect(screen.queryByTestId('error-summary')).not.toBeInTheDocument()
    })

    it('renders a summary for multiple errors', () => {
        renderWithProviders(
            <ErrorSummary
                errors={{
                    title: 'You must provide a title',
                    description: 'You must provide a description',
                }}
            />
        )

        expect(screen.getByTestId('error-summary')).toBeInTheDocument()

        expect(screen.queryAllByTestId('error-summary-message')).toHaveLength(2)

        expect(screen.getByText('You must provide a title')).toBeInTheDocument()

        expect(
            screen.getByText('You must provide a description')
        ).toBeInTheDocument()
    })
})
