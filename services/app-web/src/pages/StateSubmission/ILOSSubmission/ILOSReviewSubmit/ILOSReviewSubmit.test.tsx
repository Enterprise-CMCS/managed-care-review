import { screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { ILOSReviewSubmit } from './ILOSReviewSubmit'

const PAGE_URL = '/submissions/ilos/test-abc-123/edit/review-and-submit'

const renderPage = (onLocation?: (location: Location) => Location) =>
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={<ILOSReviewSubmit />}
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

describe('ILOSReviewSubmit', () => {
    it('shows the Review and submit placeholder', async () => {
        renderPage()

        const page = await screen.findByTestId('ilos-review-submit')
        expect(
            within(page).getByRole('group', { name: 'Review and submit' })
        ).toBeInTheDocument()
        expect(
            within(page).getByText(
                'The ILOS review and submit page is coming soon.'
            )
        ).toBeInTheDocument()
    })

    it('shows Review and submit as the current step and earlier steps as complete', async () => {
        renderPage()
        await screen.findByTestId('ilos-review-submit')

        const stepIndicator = document.querySelector(
            '.usa-step-indicator'
        ) as HTMLElement
        const steps = within(stepIndicator).getAllByRole('listitem')
        expect(steps).toHaveLength(4)

        expect(steps[0]).toHaveTextContent('ILOS actuarial report')
        expect(steps[1]).toHaveTextContent('Associated rate certifications')
        expect(steps[2]).toHaveTextContent('Contacts')
        steps.slice(0, 3).forEach((step) => {
            expect(step).toHaveClass('usa-step-indicator__segment--complete')
        })

        expect(steps[3]).toHaveTextContent('Review and submit')
        expect(steps[3]).toHaveClass('usa-step-indicator__segment--current')
        expect(steps[3]).toHaveAttribute('aria-current', 'true')
    })

    it('goes back to Contacts on Back', async () => {
        let testLocation: Location | undefined
        renderPage((location) => (testLocation = location))

        await userEvent.click(
            await screen.findByRole('button', { name: 'Back' })
        )
        expect(testLocation?.pathname).toBe(
            '/submissions/ilos/test-abc-123/edit/contacts'
        )
    })
})
