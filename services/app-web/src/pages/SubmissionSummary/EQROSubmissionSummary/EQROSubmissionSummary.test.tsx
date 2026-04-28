import { screen, waitFor, within } from '@testing-library/react'
import { RoutesRecord } from '@mc-review/constants'
import { featureFlags } from '@mc-review/common-code'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    mockValidCMSUser,
    mockValidStateUser,
    mockContractPackageSubmitted,
    mockContractPackageUnlockedWithUnlockedType,
    mockEqroContractSubmittedUnderReview,
    mockEqroContractSubmittedNotSubjectToReview,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers'
import { EQROSubmissionSummary } from './EQROSubmissionSummary'
import { SubmissionSideNav } from '../../SubmissionSideNav'
import { Route, Routes } from 'react-router-dom'

describe('EQROSubmissionSummary - Unlock submission button tests', () => {
    describe('CMS User unlock submission button', () => {
        it('renders the unlock button when EQRO submission is Submitted (subject to review)', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'SUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.getByRole('link', {
                    name: 'Contract questions',
                })
            ).toBeInTheDocument()

            // Expect unlock submission button to be present
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toHaveClass('usa-button')
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeDisabled()

            // Expect Review decision to be visible for CMS users
            expect(screen.getByText('Review decision')).toBeInTheDocument()

            // Expect NEW tag to NOT be visible for initial submissions
            expect(screen.queryByText('NEW')).not.toBeInTheDocument()
        })

        it('renders the unlock button when EQRO submission is Submitted (not subject to review)', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect unlock submission button to be present
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toHaveClass('usa-button')
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeDisabled()
        })

        it('does not render unlock button when EQRO submission is already unlocked', async () => {
            const contract = mockContractPackageUnlockedWithUnlockedType({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect unlock submission button to NOT be present
            expect(
                screen.queryByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeInTheDocument()

            // Expect "No action can be taken" message instead
            expect(
                screen.getByText(
                    'No action can be taken on this submission in its current status.'
                )
            ).toBeInTheDocument()

            // Expect Review decision to be visible for CMS users on unlocked submissions
            expect(screen.getByText('Review decision')).toBeInTheDocument()
        })

        it('renders the unlock button when EQRO submission is Resubmitted', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'RESUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect unlock submission button to be present
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toHaveClass('usa-button')
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeDisabled()
        })

        it('renders the unlock button when EQRO submission is Resubmitted (not subject to review)', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect unlock submission button to be present
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toHaveClass('usa-button')
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeDisabled()

            // Expect the resubmitted banner to show correct text
            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(banner).toBeInTheDocument()
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Not subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/contract submit/)
            ).toBeInTheDocument()
        })
    })

    describe('State User review decision visibility', () => {
        it('shows Review decision when EQRO submission is Submitted', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'SUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
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
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect Review decision to be visible for state users on submitted submissions
            expect(screen.getByText('Review decision')).toBeInTheDocument()
        })

        it('shows error UI when no decision is avaliable', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'SUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
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
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect Review decision to be visible for state users on submitted submissions
            expect(screen.getByText('Review decision')).toBeInTheDocument()

            const reviewDecisionSection =
                screen.getByLabelText('Review decision')

            // Expect review determination unavailable
            expect(
                within(reviewDecisionSection).queryByText(
                    'Review determination unavailable'
                )
            ).toBeInTheDocument()
        })

        it('shows Review decision when EQRO submission is Resubmitted', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'RESUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
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
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect the resubmitted banner to show correct text
            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(banner).toBeInTheDocument()
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/contract submit/)
            ).toBeInTheDocument()
            // State users see additional "What comes next" text when subject to review
            expect(
                within(banner).getByText(/What comes next/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Check for completeness/)
            ).toBeInTheDocument()
        })

        it('shows Review decision when EQRO submission is Resubmitted (not subject to review)', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
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
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect the resubmitted banner to show correct text
            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(banner).toBeInTheDocument()
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Not subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/contract submit/)
            ).toBeInTheDocument()
            // State users see additional EQRO reminder text when not subject to review
            expect(
                within(banner).getByText(
                    /As a reminder, all contracts with EQROs must/
                )
            ).toBeInTheDocument()
        })
    })

    describe('CMS User withdraw submission button', () => {
        it('renders the withdraw button when EQRO submission is Submitted', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'SUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.getByRole('button', {
                    name: 'Withdraw submission',
                })
            ).toHaveClass('usa-button')

            // Undo withdraw should NOT be present on a submitted package
            expect(
                screen.queryByRole('button', {
                    name: 'Undo submission withdraw',
                })
            ).not.toBeInTheDocument()
        })

        it('render the withdraw button when EQRO submission is not subject to review', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.getByRole('button', {
                    name: 'Withdraw submission',
                })
            ).toBeInTheDocument()

            // Unlock is still allowed for NOT_SUBJECT_TO_REVIEW
            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
        })

        it('does not render the withdraw button when EQRO submission is already withdrawn', async () => {
            const contract = mockEqroContractSubmittedUnderReview({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
            })
            contract.reviewStatus = 'WITHDRAWN'
            contract.consolidatedStatus = 'WITHDRAWN'
            contract.reviewStatusActions = [
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-24T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'WITHDRAW',
                },
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-23T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'UNDER_REVIEW',
                },
            ]

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.queryByRole('button', {
                    name: 'Withdraw submission',
                })
            ).not.toBeInTheDocument()

            // Unlock is not allowed on a withdrawn submission either
            expect(
                screen.queryByRole('button', {
                    name: 'Unlock submission',
                })
            ).not.toBeInTheDocument()

            const reviewDecisionSection =
                screen.getByLabelText('Review decision')

            expect(
                within(reviewDecisionSection).queryByText(
                    'Subject to formal review and approval'
                )
            ).toBeInTheDocument()
        })
    })

    describe('CMS User undo withdraw submission button', () => {
        it('renders the undo withdraw button when EQRO submission is Withdrawn', async () => {
            const contract = mockEqroContractSubmittedUnderReview({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
            })
            contract.reviewStatus = 'WITHDRAWN'
            contract.consolidatedStatus = 'WITHDRAWN'

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.getByRole('button', {
                    name: 'Undo submission withdraw',
                })
            ).toHaveClass('usa-button')

            // "No action" message should not render when the undo button is available
            expect(
                screen.queryByText(
                    'No action can be taken on this submission in its current status.'
                )
            ).not.toBeInTheDocument()

            const reviewDecisionSection =
                screen.getByLabelText('Review decision')

            expect(
                within(reviewDecisionSection).queryByText(
                    'Subject to formal review and approval'
                )
            ).toBeInTheDocument()
        })

        it('does not render the undo withdraw button when EQRO submission is Submitted', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'SUBMITTED',
                consolidatedStatus: 'SUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.queryByRole('button', {
                    name: 'Undo submission withdraw',
                })
            ).not.toBeInTheDocument()
        })

        it('renders withdraw and unlock but not undo withdraw after the withdraw has been undone', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
            })
            contract.reviewStatus = 'UNDER_REVIEW'
            contract.consolidatedStatus = 'RESUBMITTED'

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                        [featureFlags.WITHDRAW_SUBMISSION.flag]: true,
                        [featureFlags.UNDO_WITHDRAW_SUBMISSION.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            expect(
                screen.getByRole('button', {
                    name: 'Withdraw submission',
                })
            ).toHaveClass('usa-button')

            expect(
                screen.getByRole('button', {
                    name: 'Unlock submission',
                })
            ).toHaveClass('usa-button')

            expect(
                screen.queryByRole('button', {
                    name: 'Undo submission withdraw',
                })
            ).not.toBeInTheDocument()
        })
    })

    describe('NEW tag on review determination change', () => {
        it('does not show NEW tag when review determination is unchanged on resubmission', async () => {
            const contract = mockEqroContractSubmittedNotSubjectToReview({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })
            // Add a previous revision with the same determination (subject to review)
            contract.packageSubmissions.push({
                ...contract.packageSubmissions[0],
                contractRevision: {
                    ...contract.packageSubmissions[0].contractRevision,
                    unlockInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2026-03-23T17:09:40.003Z',
                        updatedBy: {
                            __typename: 'UpdatedBy',
                            email: 'zuko@example.com',
                            role: 'CMS_USER',
                            familyName: 'Hotman',
                            givenName: 'Zuko',
                        },
                        updatedReason:
                            'Unlocking submission to make it subject to review',
                    },
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2026-03-24T17:10:31.154Z',
                        updatedBy: {
                            __typename: 'UpdatedBy',
                            email: 'aang@example.com',
                            role: 'STATE_USER',
                            familyName: 'Avatar',
                            givenName: 'Aang',
                        },
                        updatedReason:
                            'Resubmitting to test that the contract is now subject to review',
                    },
                },
            })
            contract.reviewStatusActions = [
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-24T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'NOT_SUBJECT_TO_REVIEW',
                },
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-23T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'NOT_SUBJECT_TO_REVIEW',
                },
            ]

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            const reviewDecisionSection =
                screen.getByLabelText('Review decision')

            // Expect NEW tag to NOT be visible when determination unchanged
            expect(
                within(reviewDecisionSection).queryByText('NEW')
            ).not.toBeInTheDocument()
        })

        it('shows NEW tag when determination changes from subject to not subject to review', async () => {
            const contract = mockEqroContractSubmittedNotSubjectToReview({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })
            // Add a previous revision that was subject to review
            contract.packageSubmissions = [
                {
                    ...contract.packageSubmissions[0],
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2026-03-24T17:01:31.902Z',
                        updatedBy: {
                            __typename: 'UpdatedBy',
                            email: 'aang@example.com',
                            role: 'STATE_USER' as const,
                            familyName: 'Avatar',
                            givenName: 'Aang',
                        },
                        updatedReason: 'Resubmission',
                    },
                    contractRevision: {
                        ...contract.packageSubmissions[0].contractRevision,
                        id: 'resubmission-submission-id',
                    },
                },
                {
                    ...contract.packageSubmissions[0],
                    contractRevision: {
                        ...contract.packageSubmissions[0].contractRevision,
                        id: 'initial-submission-id',
                        formData: {
                            ...contract.packageSubmissions[0].contractRevision
                                .formData,
                            managedCareEntities: ['MCO'],
                            eqroNewContractor: true,
                            eqroProvisionMcoNewOptionalActivity: true,
                            eqroProvisionNewMcoEqrRelatedActivities: true,
                            eqroProvisionChipEqrRelatedActivities: true,
                            eqroProvisionMcoEqrOrRelatedActivities: true,
                        },
                    },
                },
            ]
            contract.reviewStatusActions = [
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-24T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'NOT_SUBJECT_TO_REVIEW',
                },
                {
                    __typename: 'ContractReviewStatusActions',
                    updatedAt: '2026-03-23T16:35:27.793Z',
                    updatedBy: null,
                    dateApprovalReleasedToState: null,
                    updatedReason: null,
                    contractID: 'test-abc-123',
                    actionType: 'UNDER_REVIEW',
                },
            ]

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<EQROSubmissionSummary />}
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
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/test-abc-123',
                    },
                    featureFlags: {
                        [featureFlags.EQRO_SUBMISSIONS.flag]: true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            const reviewDecisionSection =
                screen.getByLabelText('Review decision')

            // Expect NEW tag to be visible when determination changed
            expect(
                within(reviewDecisionSection).queryByText('NEW')
            ).toBeInTheDocument()
        })
    })
})
