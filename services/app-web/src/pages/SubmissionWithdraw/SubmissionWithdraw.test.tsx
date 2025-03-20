import { Route, Routes } from 'react-router'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionWithdraw } from './SubmissionWithdraw'
import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageUnlockedWithUnlockedType,
    mockValidCMSUser,
} from '@mc-review/mocks'

describe('SubmissionWithdraw', () => {
    it('renders without errors', async () => {
        const contract = mockContractPackageUnlockedWithUnlockedType({
            id: 'test-abc-123',
        })
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: 'Withdraw submission',
                    level: 2,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Reason for withdrawing the submission.')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Withdraw submission' })
            ).toBeInTheDocument()
        })
    })

    it('displays an error message if no reason is provided', async () => {
        const contract = mockContractPackageUnlockedWithUnlockedType({
            id: 'test-abc-123',
        })
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByTestId('submissionWithdrawReason')
            ).toBeInTheDocument()
        })

        const submitButton = screen.getByRole('button', {
            name: 'Withdraw submission',
        })
        await user.click(submitButton)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'You must provide a reason for withdrawing this submission.'
                )
            ).toBeInTheDocument()
        })
    })
})
