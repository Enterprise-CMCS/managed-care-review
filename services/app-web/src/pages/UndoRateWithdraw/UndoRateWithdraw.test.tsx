import {
    fetchCurrentUserMock,
    mockRateSubmittedWithQuestions,
    mockValidCMSUser,
    fetchRateWithQuestionsMockSuccess,
    fetchRateMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { Routes, Route } from 'react-router'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'
import { RoutesRecord } from '@mc-review/constants'
import { RateSummary } from '../RateSummary'
import { UndoRateWithdraw } from './UndoRateWithdraw'
import { screen, waitFor } from '@testing-library/react'

describe('UndoRateWithdraw', () => {
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
            name: 'Undo Withdraw',
        })
        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a reason for this change.')
            ).toBeInTheDocument()
        })
    })
})
