import { renderWithProviders } from '../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { RateSummarySideNav } from './RateSummarySideNav'
import { RateSummary } from '../RateSummary'
import {
    fetchCurrentUserMock,
    fetchRateWithQuestionsMockSuccess,
    mockValidCMSUser,
    rateDataMock,
} from '@mc-review/mocks'
import { RateQuestionResponse } from '../QuestionResponse/QuestionResponseSummary/RateQuestionResponse'
import { screen, waitFor, within } from '@testing-library/react'

const CommonRoutes = () => (
    <Routes>
        <Route element={<RateSummarySideNav />}>
            <Route
                path={RoutesRecord.RATES_SUMMARY}
                element={<RateSummary />}
            />
            <Route
                path={RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS}
                element={<RateQuestionResponse />}
            />
        </Route>
    </Routes>
)

describe('RateSummarySideNav', () => {
    it('loads sidebar nav with expected links', async () => {
        const rate = rateDataMock()
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchRateWithQuestionsMockSuccess({ rate }),
                ],
            },
            routerProvider: {
                route: `/rates/${rate.id}`,
            },
        })

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Go to dashboard/ })
        ).toHaveLength(1)

        const summaryLink = withinSideNav.getByRole('link', {
            name: /Rate summary/,
        })
        const qaLink = withinSideNav.getByRole('link', {
            name: /Rate questions/,
        })

        // Expect rate summary link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        // Expect rate summary link to be currently selected and highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect rate summary link to have correct href url
        expect(summaryLink).toHaveAttribute('href', `/rates/${rate.id}`)

        // Expect Q&A link to exist within sidebar nav.
        expect(qaLink).toBeInTheDocument()
        // Expect Q&A link to not be currently selected
        expect(qaLink).not.toHaveClass('usa-current')
        // Expect Q&A link to have correct href url
        expect(qaLink).toHaveAttribute(
            'href',
            `/rates/${rate.id}/question-and-answers`
        )
    })
    it('renders error page if rate status is DRAFT', async () => {
        const rate = rateDataMock({}, { status: 'DRAFT' })
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchRateWithQuestionsMockSuccess({ rate }),
                ],
            },
            routerProvider: {
                route: `/rates/${rate.id}`,
            },
        })

        await waitFor(() => {
            expect(screen.getByText('System error')).toBeInTheDocument()
        })
    })
    it('redirects to rate summary Q&A page', async () => {
        const rate = rateDataMock()
        renderWithProviders(
            <Routes>
                <Route element={<RateSummarySideNav />}>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS}
                        element={<RateQuestionResponse />}
                    />
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                        }
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
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/some-contract-id/rates/${rate.id}/question-and-answers`,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Go to dashboard/ })
        ).toHaveLength(1)

        const summaryLink = withinSideNav.getByRole('link', {
            name: /Rate summary/,
        })
        const qaLink = withinSideNav.getByRole('link', {
            name: /Rate questions/,
        })

        // Expect rate summary link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        // Expect rate summary link NOT to be currently selected and highlighted
        expect(summaryLink).not.toHaveClass('usa-current')
        // Expect rate summary link to have correct href url
        expect(summaryLink).toHaveAttribute('href', `/rates/${rate.id}`)

        // Expect Q&A link to exist within sidebar nav.
        expect(qaLink).toBeInTheDocument()
        // Expect Q&A link to be currently selected
        expect(qaLink).toHaveClass('usa-current')
        // Expect Q&A link to have correct href url
        expect(qaLink).toHaveAttribute(
            'href',
            `/rates/${rate.id}/question-and-answers`
        )
    })
})
