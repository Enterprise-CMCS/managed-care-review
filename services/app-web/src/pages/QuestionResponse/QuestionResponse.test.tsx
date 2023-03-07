import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { QuestionResponse } from './QuestionResponse'
import { ldUseClientSpy, renderWithProviders } from '../../testHelpers'
import { RoutesRecord } from '../../constants/routes'
import React from 'react'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
} from '../../testHelpers/apolloMocks'
import { CmsUser } from '../../gen/gqlClient'

describe('QuestionResponse', () => {
    beforeEach(() => {
        ldUseClientSpy({ 'cms-questions': true })
    })
    afterEach(() => {
        jest.resetAllMocks()
    })
    it('renders expected questions correctly', async () => {
        const mockQuestions = {
            DMCOQuestions: {
                totalCount: 2,
                edges: [
                    {
                        __typename: 'QuestionEdge' as const,
                        node: {
                            __typename: 'Question' as const,
                            id: 'question-2-id',
                            pkgID: '15',
                            createdAt: new Date('2023-01-01'),
                            addedBy: mockValidCMSUser() as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/question-2-document-1',
                                    name: 'question-2-document-1',
                                },
                                {
                                    s3URL: 's3://bucketname/key/question-2-document-2',
                                    name: 'question-2-document-2',
                                },
                            ],
                        },
                    },
                    {
                        __typename: 'QuestionEdge' as const,
                        node: {
                            __typename: 'Question' as const,
                            id: 'question-1-id',
                            pkgID: '15',
                            createdAt: new Date('2022-12-23'),
                            addedBy: mockValidCMSUser() as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/question-1-document-1',
                                    name: 'question-1-document-1',
                                },
                            ],
                        },
                    },
                ],
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
            }
        )

        // wait for sidebar nav and add question link to exist
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        // wait for expected two tables to be on the page
        await waitFor(() => {
            expect(screen.queryAllByRole('table')).toHaveLength(2)
        })

        const dmcoSection = within(screen.getByTestId('dmco-qa-section'))
        const dmcpSection = within(screen.getByTestId('dmcp-qa-section'))
        const oactSection = within(screen.getByTestId('oact-qa-section'))

        const table1 = dmcoSection.getByTestId('question-1-id-table')
        const table2 = dmcoSection.getByTestId('question-2-id-table')

        // expect two tables to be in dmco section
        expect(table1).toBeInTheDocument()
        expect(table2).toBeInTheDocument()

        // expect documents to be on respective question tables
        expect(
            within(table1).getByText('question-1-document-1')
        ).toBeInTheDocument()
        expect(
            within(table2).getByText('question-2-document-1')
        ).toBeInTheDocument()
        expect(
            within(table2).getByText('question-2-document-2')
        ).toBeInTheDocument()

        // expect dmcp and oact section to display no questions text
        expect(
            dmcpSection.getByText(
                'This division has not submitted questions yet.'
            )
        ).toBeInTheDocument()
        expect(
            oactSection.getByText(
                'This division has not submitted questions yet.'
            )
        ).toBeInTheDocument()
    })
    it('renders division sections correctly with no questions', async () => {
        const mockQuestions = {
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
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })

        const dmcoSection = within(screen.getByTestId('dmco-qa-section'))
        const dmcpSection = within(screen.getByTestId('dmcp-qa-section'))
        const oactSection = within(screen.getByTestId('oact-qa-section'))

        // expect no questions text in each division section
        expect(
            dmcoSection.getByText(
                'This division has not submitted questions yet.'
            )
        ).toBeInTheDocument()
        expect(
            dmcpSection.getByText(
                'This division has not submitted questions yet.'
            )
        ).toBeInTheDocument()
        expect(
            oactSection.getByText(
                'This division has not submitted questions yet.'
            )
        ).toBeInTheDocument()
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
