import { Route, Routes } from 'react-router'
import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockValidCMSUser,
    undoWithdrawContractMockFailure,
    undoWithdrawContractMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { UndoSubmissionWithdraw } from './UndoSubmissionWithdraw'
import { waitFor, screen } from '@testing-library/react'
import { Contract } from '../../gen/gqlClient'
import { Location } from 'react-router-dom'

describe('UndoSubmissionWithdraw', () => {
    it('renders without errors', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_WITHDRAW}
                        element={<UndoSubmissionWithdraw />}
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-withdraw-submission',
                },
                featureFlags: {
                    'undo-withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: 'Undo submission withdraw',
                    level: 2,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Reason for undoing the submission withdraw.')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })
    })

    it('renders generic API banner error on failed undo submission withdraw', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_WITHDRAW}
                        element={<UndoSubmissionWithdraw />}
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
                        undoWithdrawContractMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-withdraw-submission',
                },
                featureFlags: {
                    'undo-withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })

        const undoWithdrawReasonInput = screen.getByTestId(
            'undoSubmissionWithdrawReason'
        )
        const undoWithdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })

        await user.type(undoWithdrawReasonInput, 'Undo submission withdraw')
        await user.click(undoWithdrawBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('validates reason input field', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_WITHDRAW}
                        element={<UndoSubmissionWithdraw />}
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-withdraw-submission',
                },
                featureFlags: {
                    'undo-withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })

        const undoWithdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })

        await user.click(undoWithdrawBtn)

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a reason for this change.')
            ).toBeInTheDocument()
        })
    })

    it('can undo submission withdraw', async () => {
        let testLocation: Location
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        const withdrawnContract: Contract = {
            ...contract,
            reviewStatus: 'WITHDRAWN',
            consolidatedStatus: 'WITHDRAWN',
            status: 'RESUBMITTED',
            reviewStatusActions: [
                {
                    contractID: contract.id,
                    updatedAt: new Date(),
                    updatedBy: {
                        role: 'CMS_USER',
                        givenName: 'bob',
                        familyName: 'ddmas',
                        email: 'bob@dmas.mn.gov',
                    },
                    actionType: 'WITHDRAW',
                    updatedReason: 'a valid note',
                },
            ],
        }
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_WITHDRAW}
                        element={<UndoSubmissionWithdraw />}
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
                            contract: withdrawnContract,
                        }),
                        fetchContractMockSuccess({
                            contract: withdrawnContract,
                        }),
                        undoWithdrawContractMockSuccess({
                            contractData: contract,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-withdraw-submission',
                },
                featureFlags: {
                    'withdraw-submission': true,
                    'undo-withdraw-submission': true,
                },
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })

        const undoWithdrawReasonInput = screen.getByTestId(
            'undoSubmissionWithdrawReason'
        )
        const undoWithdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })

        await user.type(undoWithdrawReasonInput, 'Undo submission withdraw')
        await user.click(undoWithdrawBtn)

        await waitFor(() => {
            //Expect redirect
            expect(testLocation.pathname).toBe(
                `/submissions/health-plan/${contract.id}`
            )
            //Expect success banner
            expect(
                screen.getByTestId('statusUpdatedBanner')
            ).toBeInTheDocument()
            //Expect action buttons
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('link', {
                    name: 'Released to state',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Withdraw submission',
                })
            ).toBeInTheDocument()
        })
    })
})
