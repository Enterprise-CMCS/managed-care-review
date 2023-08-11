import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageMockSuccess,
    mockValidCMSUser,
    mockSubmittedHealthPlanPackageWithRevisions,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionRevisionSummary } from './SubmissionRevisionSummary'
import { dayjs } from '../../common-code/dateHelpers'

describe('SubmissionRevisionSummary', () => {
    it('renders correctly without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            stateSubmission:
                                mockSubmittedHealthPlanPackageWithRevisions(),
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/2',
                },
            }
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()

        const submissionVersion = `${dayjs
            .utc('2022-03-24T01:19:46.154Z')
            .tz('America/New_York')
            .format('MM/DD/YY h:mma')} ET version`
        expect(await screen.findByText(submissionVersion)).toBeInTheDocument()
        expect(
            await screen.findByTestId('previous-submission-banner')
        ).toBeInTheDocument()
    })
    it('extracts the correct dates from the submission and displays them in tables', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            stateSubmission:
                                mockSubmittedHealthPlanPackageWithRevisions(),
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/2',
                },
            }
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(2)
            expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
            expect(
                within(rows[1]).getByText(
                    dayjs(
                        mockSubmittedHealthPlanPackageWithRevisions()
                            .revisions[2]?.node?.submitInfo?.updatedAt
                    ).format('M/D/YY')
                )
            ).toBeInTheDocument()
        })
    })
})
