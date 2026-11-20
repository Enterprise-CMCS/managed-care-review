import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { ILOSSubmissionDetails } from './ILOSSubmissionDetails'
import { Header } from '../../../../components/Header'
import { NewSubmissionForm } from '../../SharedSubmissionComponents/NewSubmissionForm/NewSubmissionForm'

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
        ).toBeInTheDocument()
    })

    it('renders the ILOS steps with the first step current', async () => {
        renderPage()

        expect(
            await screen.findByRole('heading', {
                level: 2,
                name: /Step\s*1\s*of 4\s*ILOS actuarial report/,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText('Associated rate certifications')
        ).toBeInTheDocument()
        expect(screen.getByText('Contacts')).toBeInTheDocument()
        expect(screen.getByText('Review and submit')).toBeInTheDocument()
    })

    it('shows ILOS as the contract type in the page header', async () => {
        renderWithProviders(
            <>
                <Header authMode="AWS_COGNITO" />
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                        element={<NewSubmissionForm />}
                    />
                </Routes>
            </>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchCurrentUserMock({ statusCode: 200 }),
                    ],
                },
                routerProvider: { route: '/submissions/new/ilos' },
            }
        )

        expect(await screen.findByTestId('contractType')).toHaveTextContent(
            'ILOS'
        )
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
