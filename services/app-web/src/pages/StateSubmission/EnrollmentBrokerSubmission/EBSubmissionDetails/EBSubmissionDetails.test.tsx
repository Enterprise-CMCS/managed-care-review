import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { EBSubmissionDetails } from './EBSubmissionDetails'

describe('EBSubmissionDetails', () => {
    it('renders the placeholder inside the form skeleton', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<EBSubmissionDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/eb' },
            }
        )

        expect(
            await screen.findByTestId('eb-submission-details-placeholder')
        ).toBeInTheDocument()
        expect(screen.getByTestId('SubmissionDetails')).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Save & Continue' })
		).toHaveAttribute('aria-disabled', 'true')
    })

    it('returns to the dashboard on Cancel', async () => {
        let testLocation: Location | undefined
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<EBSubmissionDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/eb' },
                location: (location) => (testLocation = location),
            }
        )

        await userEvent.click(
            await screen.findByRole('button', { name: 'Cancel' })
        )
        expect(testLocation?.pathname).toBe(RoutesRecord.DASHBOARD_SUBMISSIONS)
    })
})
