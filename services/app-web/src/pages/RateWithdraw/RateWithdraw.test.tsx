import { renderWithProviders } from '../../testHelpers'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    fetchContractMockSuccess,
    fetchRateMockSuccess,
    fetchRateWithQuestionsMockSuccess,
    withdrawRateMockFailure,
    mockContractPackageSubmitted,
    mockRateSubmittedWithQuestions,
    withdrawRateMockSuccess,
} from '@mc-review/mocks'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '@mc-review/constants'
import { RateSummary } from '../SubmissionSummary'
import { RateWithdraw } from './RateWithdraw'
import { waitFor, screen } from '@testing-library/react'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'
import { Rate } from '../../gen/gqlClient'

describe('RateWithdraw', () => {
    it('can withdraw a rate', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
        })
        const rate = mockRateSubmittedWithQuestions({
            id: 'test-abc-123',
            parentContractID: 'test-abc-123',
        })
        const withdrawnRate: Rate = {
            ...rate,
            reviewStatus: 'WITHDRAWN',
            consolidatedStatus: 'WITHDRAWN',
            reviewStatusActions: [
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
                        path={RoutesRecord.RATE_WITHDRAW}
                        element={<RateWithdraw />}
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
                        fetchRateWithQuestionsMockSuccess({
                            rate: withdrawnRate,
                        }),
                        fetchRateMockSuccess(rate),
                        withdrawRateMockSuccess({ rateData: rate }),
                        fetchContractMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rate-reviews/test-abc-123/withdraw-rate',
                },
                featureFlags: {
                    'withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByText('Withdraw a rate')).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Withdraw rate' })
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Withdraw rate',
        })
        const withdrawReasonInput = screen.getByTestId('rateWithdrawReason')
        await user.type(withdrawReasonInput, 'a valid note')

        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(screen.getByTestId('rateWithdrawBanner')).toBeInTheDocument()
        })

        expect(
            screen.getByText(
                "No action can be taken on this submission in it's current status."
            )
        ).toBeInTheDocument()
    })

    it('renders generic API error on failed withdraw', async () => {
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
                        path={RoutesRecord.RATE_WITHDRAW}
                        element={<RateWithdraw />}
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
                        fetchRateMockSuccess(rate),
                        withdrawRateMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/rate-reviews/test-abc-123/withdraw-rate',
                },
                featureFlags: {
                    'withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByTestId('rateWithdrawReason')
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Withdraw rate',
        })
        const dateInput = screen.getByTestId('rateWithdrawReason')
        await user.type(dateInput, 'withdraw rate')

        await user.click(withdrawBtn)
        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('renders form validation error when required withdraw reason field is missing', async () => {
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
                        path={RoutesRecord.RATE_WITHDRAW}
                        element={<RateWithdraw />}
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
                    route: '/rate-reviews/test-abc-123/withdraw-rate',
                },
                featureFlags: {
                    'withdraw-rate': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByTestId('rateWithdrawReason')
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Withdraw rate',
        })
        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'You must provide a reason for withdrawing this rate.'
                )
            ).toBeInTheDocument()
        })
    })
})
