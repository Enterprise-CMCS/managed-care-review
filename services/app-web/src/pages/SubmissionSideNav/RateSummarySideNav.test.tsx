import { renderWithProviders } from '../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../constants'
import { RateSummarySideNav } from './RateSummarySideNav'
import { RateSummary } from '../RateSummary'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidCMSUser,
    rateDataMock,
} from '../../testHelpers/apolloMocks'
import { RateQuestionResponse } from '../QuestionResponse/RateQuestionResponse'
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
                    fetchRateMockSuccess(rate),
                ],
            },
            routerProvider: {
                route: `/rates/${rate.id}`,
            },
            featureFlags: {
                'qa-by-rates': true,
            },
        })

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Back to dashboard/ })
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
                    fetchRateMockSuccess(rate),
                ],
            },
            routerProvider: {
                route: `/rates/${rate.id}`,
            },
            featureFlags: {
                'qa-by-rates': true,
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
                        fetchRateMockSuccess(rate),
                    ],
                },
                routerProvider: {
                    route: `/submissions/some-contract-id/rate/${rate.id}/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Back to dashboard/ })
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
