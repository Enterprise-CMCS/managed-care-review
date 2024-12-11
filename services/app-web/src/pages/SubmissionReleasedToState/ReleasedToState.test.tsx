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

describe('ReleasedToState', () => {
    it('can submit to mark submission as released to state', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
                reviewStatus: 'UNDER_REVIEW',
                consolidatedStatus: 'RESUBMITTED',
                reviewStatusActions: [],
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
                        }),
                        fetchContractMockSuccess({
                            contract,
                        }),
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
                        }),
                        fetchContractMockSuccess({
                            contract: approvedContract,
                        }),
                        fetchContractMockSuccess({
                            contract: approvedContract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/released-to-state',
                },
                featureFlags: {
                    'submission-approvals': true,
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
    it('renders generic API error on failed approval', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(
            'test-abc-123',
            {
                status: 'RESUBMITTED',
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
                    route: '/submissions/test-abc-123/released-to-state',
                },
                featureFlags: {
                    'submission-approvals': true,
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
                    route: '/submissions/test-abc-123/released-to-state',
                },
                featureFlags: {
                    'submission-approvals': true,
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
                    route: '/submissions/test-abc-123/released-to-state',
                },
                featureFlags: {
                    'submission-approvals': true,
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
})
