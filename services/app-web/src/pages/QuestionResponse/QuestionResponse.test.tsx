import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { QuestionResponse } from './QuestionResponse'
import { renderWithProviders } from '../../testHelpers'
import { RoutesRecord } from '../../constants/routes'

import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockQuestionsPayload,
    mockValidUser,
} from '../../testHelpers/apolloMocks'
import { IndexQuestionsPayload } from '../../gen/gqlClient'

describe('QuestionResponse', () => {
    it('renders expected questions correctly with rounds', async () => {
        const mockQuestions = mockQuestionsPayload('15')

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
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
                            questions: mockQuestions,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        // wait for sidebar nav and add question link to exist
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        // Wait for 4 tables (4 questions) to exist
        await waitFor(() => {
            expect(screen.queryAllByRole('table')).toHaveLength(4)
        })

        // Get division sections
        const dmcoSection = within(screen.getByTestId('dmco-qa-section'))
        const dmcpSection = within(screen.getByTestId('dmcp-qa-section'))
        const oactSection = within(screen.getByTestId('oact-qa-section'))

        // Get all tables in each division section=
        const dmcoTable1 = dmcoSection.getByTestId('dmco-question-1-id-table')
        const dmcoTable2 = dmcoSection.getByTestId('dmco-question-2-id-table')
        const dmcpTable1 = dmcpSection.getByTestId('dmcp-question-1-id-table')
        const oactTable1 = oactSection.getByTestId('oact-question-1-id-table')

        // Get all Round h4 headers for each division section
        const dmcoRounds = dmcoSection.queryAllByRole('heading', {
            name: /Round [0-9]+$/,
            level: 4,
        })
        const dmcpRounds = dmcpSection.queryAllByRole('heading', {
            name: /Round [0-9]+$/,
            level: 4,
        })
        const oactRounds = oactSection.queryAllByRole('heading', {
            name: /Round [0-9]+$/,
            level: 4,
        })

        // DMCO Questions
        // expect two tables in dmco section
        expect(dmcoTable1).toBeInTheDocument()
        expect(dmcoTable2).toBeInTheDocument()

        //expect two rounds of questions
        expect(dmcoRounds).toHaveLength(2)
        // Expect first displayed round to be the latest round
        expect(dmcoRounds[0]).toHaveTextContent('Round 2')
        // Expect last displayed round to be the first round
        expect(dmcoRounds[1]).toHaveTextContent('Round 1')
        // expect documents to be on respective question tables
        expect(
            within(dmcoTable1).getByText('dmco-question-1-document-1')
        ).toBeInTheDocument()
        expect(
            within(dmcoTable1).getByText('response-to-dmco-1-document-1')
        ).toBeInTheDocument()
        expect(
            within(dmcoTable2).getByText('dmco-question-2-document-1')
        ).toBeInTheDocument()
        expect(
            within(dmcoTable2).getByText('dmco-question-2-document-2')
        ).toBeInTheDocument()
        expect(
            within(dmcoTable2).getByText('response-to-dmco-2-document-1')
        ).toBeInTheDocument()

        // DMCP Question
        // expect one table in dmcp section
        expect(dmcpTable1).toBeInTheDocument()
        //expect one rounds of questions
        expect(dmcpRounds).toHaveLength(1)
        // Expect header to be Round 1
        expect(dmcpRounds[0]).toHaveTextContent('Round 1')
        // expect documents to be on respective question tables
        expect(
            within(dmcpTable1).getByText('dmcp-question-1-document-1')
        ).toBeInTheDocument()
        expect(
            within(dmcpTable1).getByText('response-to-dmcp-1-document-1')
        ).toBeInTheDocument()

        // OACT question
        // expect one table in oact section
        expect(oactTable1).toBeInTheDocument()
        //expect one rounds of questions
        expect(oactRounds).toHaveLength(1)
        // Expect header to be Round 1
        expect(oactRounds[0]).toHaveTextContent('Round 1')
        // expect documents to be on respective question tables
        expect(
            within(oactTable1).getByText('oact-question-1-document-1')
        ).toBeInTheDocument()
        expect(
            within(oactTable1).getByText('response-to-oact-1-document-1')
        ).toBeInTheDocument()
    })
    it('renders the CMS users division questions first', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                            questions: mockQuestionsPayload('15'),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        const qaSections = screen.getAllByTestId(/.*-qa-section/)

        //Expect there to be three qa sections
        expect(qaSections).toHaveLength(3)
        expect(qaSections[0]).toHaveTextContent('Asked by OACT')
        expect(qaSections[1]).toHaveTextContent('Asked by DMCO')
        expect(qaSections[2]).toHaveTextContent('Asked by DMCP')
    })
    it('does not render the divisions question if no question exist', async () => {
        const mockQuestionWithNoOACT: IndexQuestionsPayload = {
            ...mockQuestionsPayload('15'),
            OACTQuestions: {
                totalCount: 0,
                edges: [],
            },
        }

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                            questions: mockQuestionWithNoOACT,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        const qaSections = screen.getAllByTestId(/.*-qa-section/)

        //Expect there to be two qa sections
        expect(qaSections).toHaveLength(2)
        expect(qaSections[0]).toHaveTextContent('Asked by DMCO')
        expect(qaSections[1]).toHaveTextContent('Asked by DMCP')
    })
    it('renders no questions have been submitted yet text', async () => {
        const mockQuestionWithNoOACT: IndexQuestionsPayload = {
            DMCOQuestions: {
                totalCount: 0,
                edges: [],
            },
            DMCPQuestions: {
                totalCount: 0,
                edges: [],
            },
            OACTQuestions: {
                totalCount: 0,
                edges: [],
            },
        }

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                            questions: mockQuestionWithNoOACT,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        const qaSections = screen.queryByTestId(/.*-qa-section/)

        //Expect there to be no QA sections
        expect(qaSections).toBeNull()

        // Expect no questions text
        expect(
            screen.getByText('No questions have been submitted yet.')
        ).toBeInTheDocument()
    })
    it('renders with question submit banner after question submitted', async () => {
        const mockQuestions = mockQuestionsPayload('15')
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
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
                            questions: mockQuestions,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers?submit=question',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await screen.findByTestId('sidenav')
        expect(screen.getByTestId('alert')).toHaveClass('usa-alert--success')
        expect(screen.getByText('Questions sent')).toBeInTheDocument()
    })
    it('renders with response submit banner after response submitted', async () => {
        const mockQuestions = mockQuestionsPayload('15')
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                            questions: mockQuestions,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers?submit=response',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await screen.findByTestId('sidenav')
        expect(screen.getByTestId('alert')).toHaveClass('usa-alert--success')
        expect(screen.getByText('Response sent')).toBeInTheDocument()
    })
    it('CMS users see add questions link on Q&A page', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
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
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })
    })
    it('State users does not see add questions link on Q&A page', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
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
                    route: '/submissions/15/question-and-answers',
                },
                featureFlags: {
                    'cms-questions': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).not.toBeInTheDocument()
        })
    })
})
