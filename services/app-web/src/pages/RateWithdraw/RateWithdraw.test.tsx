import { renderWithProviders } from '../../testHelpers'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    fetchRateMockSuccess,
} from '@mc-review/mocks'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '@mc-review/constants'
import { RateSummary } from '../SubmissionSummary'
import { RateWithdraw } from './RateWithdraw'
import { waitFor, screen } from '@testing-library/react'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'

describe('RateWithdraw', () => {
    it('renders form validation error when required withdraw reason field is missing', async () => {
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
