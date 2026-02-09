import { screen, waitFor } from '@testing-library/react'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    mockValidCMSUser,
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
        })
    })
})