import { Route, Routes } from 'react-router'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionWithdraw } from './SubmissionWithdraw'
import {
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
                screen.getByText(
                    'Provide a reason for withdrawing the submission.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Withdraw submission' })
            ).toBeInTheDocument()
        })
    })
})
