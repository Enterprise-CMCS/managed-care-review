import { screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { ILOSAssociatedRateCertifications } from './ILOSAssociatedRateCertifications'

const PAGE_URL =
    '/submissions/ilos/test-abc-123/edit/associated-rate-certifications'

const renderPage = (onLocation?: (location: Location) => Location) =>
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS}
                element={<ILOSAssociatedRateCertifications />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
            routerProvider: { route: PAGE_URL },
            location: onLocation,
        }
    )

describe('ILOSAssociatedRateCertifications', () => {
    it('shows Associated rate certifications as the current step and ILOS actuarial report as complete', async () => {
        renderPage()

        expect(
            await screen.findByTestId('associatedRateCertifications')
        ).toBeInTheDocument()

        const stepIndicator = document.querySelector(
            '.usa-step-indicator'
        ) as HTMLElement
        const steps = within(stepIndicator).getAllByRole('listitem')
        expect(steps).toHaveLength(4)

        // ILOS actuarial report: completed
        expect(steps[0]).toHaveTextContent('ILOS actuarial report')
        expect(steps[0]).toHaveClass('usa-step-indicator__segment--complete')

        // Associated rate certifications: current
        expect(steps[1]).toHaveTextContent('Associated rate certifications')
        expect(steps[1]).toHaveClass('usa-step-indicator__segment--current')
        expect(steps[1]).toHaveAttribute('aria-current', 'true')

        // Later steps: not started
        expect(steps[2]).toHaveTextContent('Contacts')
        expect(steps[3]).toHaveTextContent('Review and submit')
        steps.slice(2).forEach((step) => {
            expect(step).not.toHaveClass(
                'usa-step-indicator__segment--complete'
            )
            expect(step).not.toHaveClass('usa-step-indicator__segment--current')
        })
    })

    it('goes back to the ILOS actuarial report on Back', async () => {
        let testLocation: Location | undefined
        renderPage((location) => (testLocation = location))

        await userEvent.click(
            await screen.findByRole('button', { name: 'Back' })
        )
        expect(testLocation?.pathname).toBe(
            '/submissions/ilos/test-abc-123/edit/type'
        )
    })

    it('continues to Contacts', async () => {
        let testLocation: Location | undefined
        renderPage((location) => (testLocation = location))

        await userEvent.click(
            await screen.findByRole('button', { name: 'Continue' })
        )
        expect(testLocation?.pathname).toBe(
            '/submissions/ilos/test-abc-123/edit/contacts'
        )
    })
})
