import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageApprovedWithQuestions,
    mockContractPackageSubmitted,
    mockValidAdminUser,
    reverseApproveContractMockFailure,
    reverseApproveContractMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { UndoSubmissionApproval } from './UndoSubmissionApproval'
import { waitFor, screen } from '@testing-library/react'
import { Location, NavigateFunction, Route, Routes } from 'react-router-dom'

describe('UndoSubmissionApproval', () => {
    it('renders without errors', async () => {
        const contract = mockContractPackageApprovedWithQuestions({
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
                        path={RoutesRecord.UNDO_SUBMISSION_APPROVAL}
                        element={<UndoSubmissionApproval />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-approval',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: 'Undo submission approval',
                    level: 1,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Reason for undoing the submission approval.')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', {
                    name: 'Undo submission approval',
                })
            ).toBeInTheDocument()
        })
    })

    it('renders 404 page on wrong contract type url parameter', async () => {
        let testNavigate: NavigateFunction
        let testLocation: Location

        const contract = mockContractPackageApprovedWithQuestions({
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
                        path={RoutesRecord.UNDO_SUBMISSION_APPROVAL}
                        element={<UndoSubmissionApproval />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-approval',
                },
                navigate: (nav) => (testNavigate = nav),
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            testNavigate(
                '/submission-reviews/health-plan/test-abc-123/undo-submission-approval'
            )
        })

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: /Undo submission approval/,
                    level: 1,
                })
            ).toBeInTheDocument()
        })

        await waitFor(() => {
            testNavigate(
                '/submission-reviews/eqro/test-abc-123/undo-submission-approval'
            )
        })

        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                '/submission-reviews/eqro/test-abc-123/undo-submission-approval'
            )
            expect(screen.getByText('404 / Page not found')).toBeInTheDocument()
        })
    })

    it('renders generic API banner error on failed undo submission approval', async () => {
        const contract = mockContractPackageApprovedWithQuestions({
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
                        path={RoutesRecord.UNDO_SUBMISSION_APPROVAL}
                        element={<UndoSubmissionApproval />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                        reverseApproveContractMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-approval',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', {
                    name: 'Undo submission approval',
                })
            ).toBeInTheDocument()
        })

        const undoApprovalReasonInput = screen.getByTestId(
            'undoSubmissionApprovalReason'
        )
        const undoApprovalBtn = screen.getByRole('button', {
            name: 'Undo submission approval',
        })

        await user.type(undoApprovalReasonInput, 'undo reason')
        await user.click(undoApprovalBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('validates reason input field', async () => {
        const contract = mockContractPackageApprovedWithQuestions({
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
                        path={RoutesRecord.UNDO_SUBMISSION_APPROVAL}
                        element={<UndoSubmissionApproval />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-approval',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', {
                    name: 'Undo submission approval',
                })
            ).toBeInTheDocument()
        })

        const undoApprovalBtn = screen.getByRole('button', {
            name: 'Undo submission approval',
        })

        await user.click(undoApprovalBtn)

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a reason for this change.')
            ).toBeInTheDocument()
        })
    })

    it('can undo submission approval', async () => {
        let testLocation: Location
        const approvedContract = mockContractPackageApprovedWithQuestions({
            id: 'test-abc-123',
            contractSubmissionType: 'HEALTH_PLAN',
        })
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
                        path={RoutesRecord.UNDO_SUBMISSION_APPROVAL}
                        element={<UndoSubmissionApproval />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: approvedContract,
                        }),
                        fetchContractMockSuccess({
                            contract: approvedContract,
                        }),
                        reverseApproveContractMockSuccess({
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-approval',
                },
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', {
                    name: 'Undo submission approval',
                })
            ).toBeInTheDocument()
        })

        const undoApprovalReasonInput = screen.getByTestId(
            'undoSubmissionApprovalReason'
        )
        const undoApprovalBtn = screen.getByRole('button', {
            name: 'Undo submission approval',
        })

        await user.type(undoApprovalReasonInput, 'Undo submission approval')
        await user.click(undoApprovalBtn)

        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                `/submissions/health-plan/${contract.id}`
            )
        })
    })
})
