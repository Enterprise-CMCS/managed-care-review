import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockContractPackageUnlockedWithUnlockedType,
    mockValidAdminUser,
    undoUnlockContractMockFailure,
    undoUnlockContractMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { UndoSubmissionUnlock } from './UndoSubmissionUnlock'
import { waitFor, screen } from '@testing-library/react'
import { Location, NavigateFunction, Route, Routes } from 'react-router-dom'

describe('UndoSubmissionUnlock', () => {
    it('renders without errors', async () => {
        const contract = mockContractPackageUnlockedWithUnlockedType({
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
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: 'Undo submission unlock',
                    level: 1,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Reason for undoing the submission unlock.')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Undo submission unlock' })
            ).toBeInTheDocument()
        })
    })

    it('renders 404 page on wrong contract type url parameter', async () => {
        let testNavigate: NavigateFunction
        let testLocation: Location

        const contract = mockContractPackageUnlockedWithUnlockedType({
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
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock',
                },
                navigate: (nav) => (testNavigate = nav),
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            testNavigate(
                '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock'
            )
        })

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: /Undo submission unlock/,
                    level: 1,
                })
            ).toBeInTheDocument()
        })

        await waitFor(() => {
            testNavigate(
                '/submission-reviews/eqro/test-abc-123/undo-submission-unlock'
            )
        })

        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                '/submission-reviews/eqro/test-abc-123/undo-submission-unlock'
            )
            expect(screen.getByText('404 / Page not found')).toBeInTheDocument()
        })
    })

    it('renders generic API banner error on failed undo submission unlock', async () => {
        const contract = mockContractPackageUnlockedWithUnlockedType({
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
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
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
                        undoUnlockContractMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo submission unlock' })
            ).toBeInTheDocument()
        })

        const undoUnlockReasonInput = screen.getByTestId(
            'undoSubmissionUnlockReason'
        )
        const undoUnlockBtn = screen.getByRole('button', {
            name: 'Undo submission unlock',
        })

        await user.type(undoUnlockReasonInput, 'undo reason')
        await user.click(undoUnlockBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('validates reason input field', async () => {
        const contract = mockContractPackageUnlockedWithUnlockedType({
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
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock',
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo submission unlock' })
            ).toBeInTheDocument()
        })

        const undoUnlockBtn = screen.getByRole('button', {
            name: 'Undo submission unlock',
        })

        await user.click(undoUnlockBtn)

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a reason for this change.')
            ).toBeInTheDocument()
        })
    })

    it('can undo submission unlock', async () => {
        let testLocation: Location
        const unlockedContract = mockContractPackageUnlockedWithUnlockedType({
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
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
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
                            contract: unlockedContract,
                        }),
                        fetchContractMockSuccess({
                            contract: unlockedContract,
                        }),
                        undoUnlockContractMockSuccess({
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
                    route: '/submission-reviews/health-plan/test-abc-123/undo-submission-unlock',
                },
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Undo submission unlock' })
            ).toBeInTheDocument()
        })

        const undoUnlockReasonInput = screen.getByTestId(
            'undoSubmissionUnlockReason'
        )
        const undoUnlockBtn = screen.getByRole('button', {
            name: 'Undo submission unlock',
        })

        await user.type(undoUnlockReasonInput, 'Undo submission unlock')
        await user.click(undoUnlockBtn)

        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                `/submissions/health-plan/${contract.id}`
            )
        })

        await waitFor(() => {
            expect(
                screen.getByRole('link', { name: 'Released to state' })
            ).toBeInTheDocument()
        })
    })
})
