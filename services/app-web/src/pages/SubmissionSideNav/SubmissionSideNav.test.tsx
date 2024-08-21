import { screen, waitFor, within } from '@testing-library/react'
import { Location, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { SubmissionSideNav } from './SubmissionSideNav'
import { SubmissionSummary } from '../SubmissionSummary'
import { QuestionResponse } from '../QuestionResponse'
import { renderWithProviders } from '../../testHelpers'
import { RoutesRecord } from '../../constants/routes'
import React from 'react'
import {
    fetchContractMockSuccess,
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageWithQuestionsMockNotFound,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockContractPackageSubmitted,
    mockDraftHealthPlanPackage,
    mockQuestionsPayload,
    mockSubmittedHealthPlanPackage,
    mockValidCMSUser,
} from '../../testHelpers/apolloMocks'

describe('SubmissionSideNav', () => {
    it('loads sidebar nav with expected links', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        // Wait for sidebar nav to exist.
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Back to dashboard/ })
        ).toHaveLength(1)

        const summaryLink = withinSideNav.getByRole('link', {
            name: /Submission summary/,
        })
        const qaLink = withinSideNav.getByRole('link', { name: /Q&A/ })

        // Expect submission summary link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        // Expect submission summary link to be currently selected and highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect submission summary link to have correct href url
        expect(summaryLink).toHaveAttribute('href', '/submissions/15')

        // Expect Q&A link to exist within sidebar nav.
        expect(qaLink).toBeInTheDocument()
        // Expect Q&A link to not be currently selected
        expect(qaLink).not.toHaveClass('usa-current')
        // Expect Q&A link to have correct href url
        expect(qaLink).toHaveAttribute(
            'href',
            '/submissions/15/question-and-answers'
        )
    })

    it('sidebar nav links routes to correct pages', async () => {
        let testLocation: Location
        const testContract = { ...mockContractPackageSubmitted(), id: '15' }
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                        fetchContractMockSuccess({ contract: testContract }),
                        fetchContractMockSuccess({ contract: testContract }), // this is needed twice for the tests to pass since we navigate back and forth
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
                location: (location) => (testLocation = location),
            }
        )

        // Wait for sidebar nav to exist.
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
        })

        const withinSideNav = within(screen.getByTestId('sidenav'))
        const summaryLink = withinSideNav.getByRole('link', {
            name: /Submission summary/,
        })
        const qaLink = withinSideNav.getByRole('link', { name: /Q&A/ })

        // Expect submission summary and Q&A link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        expect(qaLink).toBeInTheDocument()

        // Expect submission summary link to be highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect Q&A link to not be highlighted
        expect(qaLink).not.toHaveClass('usa-current')

        // Navigate to Q&A page by link.
        await userEvent.click(qaLink)
        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                `/submissions/15/question-and-answers`
            )
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('heading', { name: 'Contract questions' })
            ).toBeInTheDocument()
        })

        // Expect Q&A link to be selected and highlighted
        expect(qaLink).toHaveClass('usa-current')
        // Expect submission summary link to not be highlighted
        expect(summaryLink).not.toHaveClass('usa-current')

        // Expect all three division sections
        expect(
            screen.queryByRole('heading', { name: 'Asked by DMCO' })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('heading', { name: 'Asked by OACT' })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('heading', { name: 'Asked by DMCP' })
        ).toBeInTheDocument()

        // Navigate back to Submission summary page by link.
        await userEvent.click(summaryLink)
        await waitFor(() => {
            expect(testLocation.pathname).toBe(`/submissions/15`)
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
        })

        // Expect submission summary link to be highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect Q&A link to not be highlighted
        expect(qaLink).not.toHaveClass('usa-current')

        // Navigate to dashboard using back to dashboard link
        await userEvent.click(
            screen.getByRole('link', { name: /Back to dashboard/ })
        )
        await waitFor(() => {
            expect(testLocation.pathname).toBe(`/dashboard/submissions`)
        })
    })

    it('renders back to dashboard link for state users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )
        expect(
            await screen.findByRole('link', { name: /Back to state dashboard/ })
        ).toBeInTheDocument()
    })

    it('renders back to dashboard link for CMS users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(
            await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
        ).toBeInTheDocument()
    })

    describe('Submission package data display', () => {
        it('Submission with no revisions shows a generic error', async () => {
            const pkg = mockSubmittedHealthPlanPackage()
            pkg.revisions = []

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS
                            }
                            element={<QuestionResponse />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: pkg,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },

                }
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('Submission with broken proto shows a generic error', async () => {
            const pkg = mockSubmittedHealthPlanPackage()
            pkg.revisions[0].node.formDataProto = 'BORKED'

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS
                            }
                            element={<QuestionResponse />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: pkg,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },

                }
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('DRAFT displays an error to a CMS user', async () => {
            const pkg = mockDraftHealthPlanPackage()

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS
                            }
                            element={<QuestionResponse />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: pkg,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },

                }
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('shows a generic 404 page when package is not found', async () => {
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS
                            }
                            element={<QuestionResponse />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchStateHealthPlanPackageWithQuestionsMockNotFound(
                                {
                                    id: '404',
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/404' },

                }
            )

            const notFound = await screen.findByText('404 / Page not found')
            expect(notFound).toBeInTheDocument()
        })
        it('shows a generic error page when user is undefined', async () => {
            const testQuestions = mockQuestionsPayload('15')
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS
                            }
                            element={<QuestionResponse />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 403 }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    questions: testQuestions,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/question-and-answers',
                    },

                }
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })
    })
})
