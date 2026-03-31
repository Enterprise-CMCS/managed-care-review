import { screen, waitFor, within } from '@testing-library/react'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    mockValidCMSUser,
    mockValidStateUser,
    mockContractPackageSubmitted,
    mockContractPackageUnlockedWithUnlockedType,
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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
                    featureFlags: {},
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

    describe('NEW tag on review determination change', () => {
        it('shows NEW tag when review determination changes on resubmission', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'RESUBMITTED',
            })
            // Add a previous revision with a different determination (not subject to review)
            // so that calcChangeInReviewDetermination detects the change.
            contract.packageSubmissions.push({
                ...contract.packageSubmissions[0],
                contractRevision: {
                    ...contract.packageSubmissions[0].contractRevision,
                    formData: {
                        ...contract.packageSubmissions[0].contractRevision
                            .formData,
                        eqroProvisionMcoEqrOrRelatedActivities: false,
                    },
                },
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
                    featureFlags: {},
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect NEW tag to be visible when determination changed
            expect(screen.getByText('NEW')).toBeInTheDocument()
        })

        it('does not show NEW tag when review determination is unchanged on resubmission', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'RESUBMITTED',
            })
            // Add a previous revision with the same determination (subject to review)
            contract.packageSubmissions.push({
                ...contract.packageSubmissions[0],
                contractRevision: {
                    ...contract.packageSubmissions[0].contractRevision,
                    formData: {
                        ...contract.packageSubmissions[0].contractRevision
                            .formData,
                        eqroProvisionMcoEqrOrRelatedActivities: true,
                        eqroProvisionMcoNewOptionalActivity: true,
                        eqroProvisionNewMcoEqrRelatedActivities: false,
                    },
                },
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
                    featureFlags: {},
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect NEW tag to NOT be visible when determination unchanged
            expect(screen.queryByText('NEW')).not.toBeInTheDocument()
        })

        it('shows NEW tag when determination changes from subject to not subject to review', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
                contractSubmissionType: 'EQRO',
                status: 'RESUBMITTED',
                consolidatedStatus: 'NOT_SUBJECT_TO_REVIEW',
            })
            // Add a previous revision that was subject to review
            contract.packageSubmissions.push({
                ...contract.packageSubmissions[0],
                contractRevision: {
                    ...contract.packageSubmissions[0].contractRevision,
                    formData: {
                        ...contract.packageSubmissions[0].contractRevision
                            .formData,
                        eqroProvisionMcoEqrOrRelatedActivities: true,
                        eqroProvisionMcoNewOptionalActivity: true,
                        eqroProvisionNewMcoEqrRelatedActivities: false,
                    },
                },
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
                    featureFlags: {},
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-summary')
                ).toBeInTheDocument()
            })

            // Expect NEW tag to be visible when determination changed
            expect(screen.getByText('NEW')).toBeInTheDocument()
        })
    })
})
