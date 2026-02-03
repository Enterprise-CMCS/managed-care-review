import { renderWithProviders } from '../../testHelpers'
import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmittedWithQuestions,
    mockValidCMSUser,
} from '@mc-review/mocks'
import { Route, Routes } from 'react-router'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { ReleasedToState } from './ReleasedToState'
import {
    approveContractMockFailure,
    approveContractMockSuccess,
} from '@mc-review/mocks'
import { Contract } from '../../gen/gqlClient'
import { waitFor, screen } from '@testing-library/react'
import { formatUserInputDate } from '@mc-review/dates'
import { Location, NavigateFunction } from 'react-router-dom'

describe('ReleasedToState', () => {
    it('can submit to mark submission as released to state', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
                contractSubmissionType: 'HEALTH_PLAN',
            }
        )

        const approvedContract: Contract = {
            ...contract,
            status: 'RESUBMITTED',
            reviewStatus: 'APPROVED',
            consolidatedStatus: 'APPROVED',
            reviewStatusActions: [
                {
                    actionType: 'MARK_AS_APPROVED',
                    contractID: 'test-abc-123',
                    dateApprovalReleasedToState:
                        formatUserInputDate('11/11/2024'),
                    updatedAt: new Date(),
                    updatedBy: {
                        email: 'cmsapprover@example.com',
                        familyName: 'Smith',
                        givenName: 'John',
                        role: 'CMS_APPROVER_USER',
                    },
                    updatedReason: 'Some approval reason',
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
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        }), // fetch from sidenav
                        fetchContractMockSuccess({
                            contract,
                        }), // fetch from released to state page
                        approveContractMockSuccess({
                            contractID: 'test-abc-123',
                            contractData: approvedContract,
                            dateApprovalReleasedToState:
                                formatUserInputDate('11/11/2024'),
                        }),
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: approvedContract,
                        }), // fetch from sidenav
                        fetchContractWithQuestionsMockSuccess({
                            contract: approvedContract,
                        }), // fetch from summary page
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Are you sure you want to mark this submission as Released to the state?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Released to state' })
            ).toBeInTheDocument()
        })

        const dateInput = screen.getByTestId('date-picker-external-input')
        await user.type(dateInput, '11/11/2024')
        const releaseButton = screen.getByRole('button', {
            name: 'Released to state',
        })
        await user.click(releaseButton)

        await waitFor(() => {
            expect(
                screen.getByTestId('submissionApprovedBanner')
            ).toBeInTheDocument()
        })
    })

    it('renders 404 page on wrong contract type url parameter', async () => {
        let testNavigate: NavigateFunction
        let testLocation: Location

        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
                contractSubmissionType: 'HEALTH_PLAN',
            }
        )

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        }), // fetch from sidenav
                        fetchContractMockSuccess({
                            contract,
                        }), // fetch from released to state page
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
                navigate: (nav) => (testNavigate = nav),
                location: (location) => (testLocation = location),
            }
        )

        // expect Withdraw page 404 with wrong param
        await waitFor(() => {
            testNavigate(
                '/submissions/health-plan/test-abc-123/released-to-state'
            )
        })

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: /Are you sure you want to mark this submission as Released to the state/,
                    level: 2,
                })
            ).toBeInTheDocument()
        })

        await waitFor(() => {
            testNavigate('/submissions/eqro/test-abc-123/released-to-state')
        })

        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                '/submissions/eqro/test-abc-123/released-to-state'
            )
            expect(screen.getByText('404 / Page not found')).toBeInTheDocument()
        })
    })

    it('renders generic API error on failed approval', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                contractSubmissionType: 'HEALTH_PLAN',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
            }
        )
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        fetchContractMockSuccess({
                            contract,
                        }),
                        approveContractMockFailure({}),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Are you sure you want to mark this submission as Released to the state?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Released to state' })
            ).toBeInTheDocument()
        })

        const dateInput = screen.getByTestId('date-picker-external-input')
        await user.type(dateInput, '11/11/2024')

        const releaseButton = screen.getByRole('button', {
            name: 'Released to state',
        })
        await user.click(releaseButton)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('renders form validation error when required date release field is missing', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
                contractSubmissionType: 'HEALTH_PLAN',
            }
        )
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        fetchContractMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Are you sure you want to mark this submission as Released to the state?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Released to state' })
            ).toBeInTheDocument()
        })

        const releaseButton = screen.getByRole('button', {
            name: 'Released to state',
        })
        await user.click(releaseButton)

        await waitFor(() => {
            expect(
                screen.getByText('You must select a date')
            ).toBeInTheDocument()
        })
    })

    it('renders form validation error when required date release field is a future date', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
                contractSubmissionType: 'HEALTH_PLAN',
            }
        )
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        fetchContractMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Are you sure you want to mark this submission as Released to the state?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Released to state' })
            ).toBeInTheDocument()
        })

        const dateInput = screen.getByTestId('date-picker-external-input')
        await user.type(dateInput, '11/11/3009')

        const releaseButton = screen.getByRole('button', {
            name: 'Released to state',
        })
        await user.click(releaseButton)

        await waitFor(() => {
            expect(
                screen.getByText('You must enter a valid date')
            ).toBeInTheDocument()
        })
    })

    it('renders form validation error when required date release field is not in dd/mm/yyyy format', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
                contractSubmissionType: 'HEALTH_PLAN',
            }
        )
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                        element={<ReleasedToState />}
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
                        fetchContractMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/released-to-state',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Are you sure you want to mark this submission as Released to the state?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Released to state' })
            ).toBeInTheDocument()
        })

        const releaseButton = screen.getByRole('button', {
            name: 'Released to state',
        })
        await user.click(releaseButton)
        // date validation with custom message is triggered only after
        // validation triggered on submit with empty field
        const dateInput = screen.getByTestId('date-picker-external-input')
        await user.type(dateInput, 'pinepple')

        await waitFor(() => {
            expect(
                screen.getByText('Date must be in MM/DD/YYYY format')
            ).toBeInTheDocument()
        })
    })
})
