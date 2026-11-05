import { screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { EBAssociatedContracts } from './EBAssociatedContracts'

describe('EBAssociatedContracts', () => {
    it('shows Associated Contracts as the current step and Contract details as complete', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_ASSOCIATED_CONTRACTS}
                    element={<EBAssociatedContracts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/eb/test-abc-123/edit/associated-contracts',
                },
            }
        )

        expect(
            await screen.findByTestId('associatedContracts')
        ).toBeInTheDocument()

        const stepIndicator = document.querySelector(
            '.usa-step-indicator'
        ) as HTMLElement
        const steps = within(stepIndicator).getAllByRole('listitem')
        expect(steps).toHaveLength(5)

        // Submission details: completed
        expect(steps[1]).toHaveTextContent('Contract details')
        expect(steps[1]).toHaveClass('usa-step-indicator__segment--complete')

        // Contract details: current
        expect(steps[2]).toHaveTextContent('Associated contracts')
        expect(steps[2]).toHaveClass('usa-step-indicator__segment--current')
        expect(steps[2]).toHaveAttribute('aria-current', 'true')

        // Later steps: not started
        steps.slice(3).forEach((step) => {
            expect(step).not.toHaveClass(
                'usa-step-indicator__segment--complete'
            )
            expect(step).not.toHaveClass('usa-step-indicator__segment--current')
        })
    })

    it('goes back to Contract details on Back', async () => {
        let testLocation: Location | undefined
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_ASSOCIATED_CONTRACTS}
                    element={<EBAssociatedContracts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/eb/test-abc-123/edit/associated-contracts',
                },
                location: (location) => (testLocation = location),
            }
        )

        await userEvent.click(
            await screen.findByRole('button', { name: 'Back' })
        )
        expect(testLocation?.pathname).toBe(
            '/submissions/eb/test-abc-123/edit/contract-details'
        )
    })
})
