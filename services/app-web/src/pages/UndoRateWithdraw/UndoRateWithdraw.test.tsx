import {
    fetchCurrentUserMock,
    mockRateSubmittedWithQuestions,
    mockValidCMSUser,
    fetchRateWithQuestionsMockSuccess,
    fetchRateMockSuccess,
    mockContractPackageSubmitted,
    undoWithdrawRateMockSuccess,
    fetchContractMockSuccess,
    undoWithdrawRateMockFailure,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { Routes, Route } from 'react-router'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'
import { RoutesRecord } from '@mc-review/constants'
import { RateSummary } from '../RateSummary'
import { UndoRateWithdraw } from './UndoRateWithdraw'
import { screen, waitFor } from '@testing-library/react'
import { Rate } from '../../gen/gqlClient'
import { Location } from 'react-router-dom'

describe('UndoRateWithdraw', () => {
    it('can undo rate withdraw', async () => {
        let testLocation: Location
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
        })
        const rate = mockRateSubmittedWithQuestions({
            id: 'test-abc-123',
            parentContractID: 'test-abc-123',
            reviewStatus: 'WITHDRAWN',
            consolidatedStatus: 'WITHDRAWN',
            reviewStatusActions: [
                {
                    __typename: 'RateReviewStatusActions',
                    actionType: 'WITHDRAW',
                    rateID: 'test-abc-123',
                    updatedReason: 'a valid note',
                    updatedAt: new Date(),
                    updatedBy: {
                        __typename: 'UpdatedBy',
                        email: 'cmsapprover@example.com',
                        familyName: 'Smith',
                        givenName: 'John',
                        role: 'CMS_APPROVER_USER',
                    },
                },
            ],
        })

        const undoWithdrawnRate: Rate = {
            ...rate,
            reviewStatus: 'UNDER_REVIEW',
            consolidatedStatus: 'RESUBMITTED',
            reviewStatusActions: [
                {
                    __typename: 'RateReviewStatusActions',
                    actionType: 'UNDER_REVIEW',
                    rateID: rate.id,
                    updatedReason: 'Undo withdraw rate',
                    updatedAt: new Date(),
                    updatedBy: {
                        __typename: 'UpdatedBy',
                        email: 'cmsapprover@example.com',
                        familyName: 'Smith',
                        givenName: 'John',
                        role: 'CMS_APPROVER_USER',
                    },
                },
                {
                    __typename: 'RateReviewStatusActions',
                    actionType: 'WITHDRAW',
                    rateID: rate.id,
                    updatedReason: 'a valid note',
                    updatedAt: new Date(),
                    updatedBy: {
                        __typename: 'UpdatedBy',
                        email: 'cmsapprover@example.com',
                        familyName: 'Smith',
                        givenName: 'John',
                        role: 'CMS_APPROVER_USER',
                    },
                },
            ],
        }

        const { user } = renderWithProviders(
            <Routes>
                <Route element={<RateSummarySideNav />}>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_RATE_WITHDRAW}
                        element={<UndoRateWithdraw />}
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
                        fetchRateWithQuestionsMockSuccess({ rate }),
                        fetchRateMockSuccess({ id: 'test-abc-123' }),
                        undoWithdrawRateMockSuccess({
                            rateID: 'test-abc-123',
                            updatedReason: 'Undo withdraw rate',
                        }),
                        fetchContractMockSuccess({
                            contract,
                        }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: undoWithdrawnRate,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rate-reviews/test-abc-123/undo-withdraw',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
                location: (location) => (testLocation = location),
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })

        const undoWithdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })
        const undoReasonInput = screen.getByTestId('undoWithdrawReason')

        await user.type(undoReasonInput, 'Undo withdraw rate')
        await user.click(undoWithdrawBtn)

        await waitFor(() => {
            // expect redirect
            expect(testLocation.pathname).toBe(`/rates/${contract.id}`)
            // expect unlock rate button to exist
            expect(
                screen.getByRole('button', {
                    name: 'Unlock rate',
                })
            ).toBeInTheDocument()
            // expect withdraw rate button to exist
            expect(
                screen.getByRole('button', {
                    name: 'Withdraw rate',
                })
            ).toBeInTheDocument()
        })
    })

    it('renders generic API banner error on failed undo rate withdraw', async () => {
        const rate = mockRateSubmittedWithQuestions({
            id: 'test-abc-123',
            parentContractID: 'test-abc-123',
            reviewStatus: 'WITHDRAWN',
            consolidatedStatus: 'WITHDRAWN',
            reviewStatusActions: [
                {
                    __typename: 'RateReviewStatusActions',
                    actionType: 'WITHDRAW',
                    rateID: 'test-abc-123',
                    updatedReason: 'a valid note',
                    updatedAt: new Date(),
                    updatedBy: {
                        __typename: 'UpdatedBy',
                        email: 'cmsapprover@example.com',
                        familyName: 'Smith',
                        givenName: 'John',
                        role: 'CMS_APPROVER_USER',
                    },
                },
            ],
        })

        const { user } = renderWithProviders(
            <Routes>
                <Route element={<RateSummarySideNav />}>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_RATE_WITHDRAW}
                        element={<UndoRateWithdraw />}
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
                        fetchRateWithQuestionsMockSuccess({ rate }),
                        fetchRateMockSuccess({ id: 'test-abc-123' }),
                        undoWithdrawRateMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/rate-reviews/test-abc-123/undo-withdraw',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Undo withdraw' })
            ).toBeInTheDocument()
        })

        const undoWithdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })
        const undoReasonInput = screen.getByTestId('undoWithdrawReason')

        await user.type(undoReasonInput, 'Undo withdraw rate')
        await user.click(undoWithdrawBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('renders form validation error when required reason field is missing', async () => {
        const rate = mockRateSubmittedWithQuestions({
            id: 'test-abc-123',
            parentContractID: 'test-abc-123',
        })

        const { user } = renderWithProviders(
            <Routes>
                <Route element={<RateSummarySideNav />}>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.UNDO_RATE_WITHDRAW}
                        element={<UndoRateWithdraw />}
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
                        fetchRateWithQuestionsMockSuccess({ rate }),
                        fetchRateMockSuccess({ id: 'test-abc-123' }),
                    ],
                },
                routerProvider: {
                    route: '/rate-reviews/test-abc-123/undo-withdraw',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByTestId('undoWithdrawReason')
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Undo withdraw',
        })
        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a reason for this change.')
            ).toBeInTheDocument()
        })
    })
})
