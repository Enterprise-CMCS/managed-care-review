import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { EBContractDetails } from './EBContractDetails'

describe('EBContractDetails', () => {
    it('shows Contract details as the current step and Submission details as complete', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    element={<EBContractDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/eb/test-abc-123/edit/contract-details',
                },
            }
        )

        expect(await screen.findByTestId('contractDetails')).toBeInTheDocument()

        const steps = screen.getAllByRole('listitem')
        expect(steps).toHaveLength(4)

        // Submission details: completed
        expect(steps[0]).toHaveTextContent('Submission details')
        expect(steps[0]).toHaveClass('usa-step-indicator__segment--complete')

        // Contract details: current
        expect(steps[1]).toHaveTextContent('Contract details')
        expect(steps[1]).toHaveClass('usa-step-indicator__segment--current')
        expect(steps[1]).toHaveAttribute('aria-current', 'true')

        // Later steps: not started
        steps.slice(2).forEach((step) => {
            expect(step).not.toHaveClass('usa-step-indicator__segment--complete')
            expect(step).not.toHaveClass('usa-step-indicator__segment--current')
        })
    })

    it('goes back to Submission details on Back', async () => {
        let testLocation: Location | undefined
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    element={<EBContractDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/eb/test-abc-123/edit/contract-details',
                },
                location: (location) => (testLocation = location),
            }
        )

        await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
        expect(testLocation?.pathname).toBe(
            '/submissions/eb/test-abc-123/edit/type'
        )
    })
})
