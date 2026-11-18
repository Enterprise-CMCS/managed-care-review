import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { ILOSSubmissionDetails } from './ILOSSubmissionDetails'

describe('ILOSSubmissionDetails', () => {
    const renderPage = (onLocation?: (location: Location) => Location) =>
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<ILOSSubmissionDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/ilos' },
                location: onLocation,
            }
        )

    it('renders the placeholder with continue disabled', async () => {
        renderPage()

        expect(
            await screen.findByTestId('ilos-submission-details-placeholder')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Save & Continue' })
        ).toHaveAttribute('aria-disabled', 'true')
    })

    it('returns to the dashboard on Cancel', async () => {
        let testLocation: Location | undefined
        renderPage((location) => (testLocation = location))

        await userEvent.click(
            await screen.findByRole('button', { name: 'Cancel' })
        )

        expect(testLocation?.pathname).toBe(RoutesRecord.DASHBOARD_SUBMISSIONS)
    })
})
