//@eslint-gignore  jest/no-disabled-tests
import {
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockContractPackageDraft,
    mockContractPackageSubmittedWithQuestions,
    mockValidCMSUser,
    mockValidStateUser,
    mockContractPackageApprovedWithQuestions,
} from '@mc-review/mocks'
import { IndexContractQuestionsPayload } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { ContractQuestionResponse } from './ContractQuestionResponse'
import { SubmissionSummary } from '../../SubmissionSummary'
import { screen, waitFor, within } from '@testing-library/react'

describe('ContractQuestionResponse', () => {
    describe('State user tests', () => {
        const CommonStateRoutes = () => (
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                </Route>
            </Routes>
        )

        it('renders questions in correct sections', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContractPackageSubmittedWithQuestions(),
                                    id: 'test-contract-id',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-contract-id/question-and-answers',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: `Outstanding questions`,
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: `Answered questions`,
                    })
                ).toBeInTheDocument()
            })

            const outstandingQuestionsSection = within(
                screen.getByTestId('outstandingQuestions')
            )
            const answeredQuestionsSection = within(
                screen.getByTestId('answeredQuestions')
            )

            const outstandingRounds =
                outstandingQuestionsSection.getAllByTestId(
                    'questionResponseRound'
                )
            const answeredRounds = answeredQuestionsSection.getAllByTestId(
                'questionResponseRound'
            )

            // expect 1 outstanding round
            expect(outstandingRounds).toHaveLength(1)

            // expect correct content for round
            expect(outstandingRounds[0]).toHaveTextContent(
                'Asked by: Division of Managed Care Operations (DMCO)'
            )
            expect(outstandingRounds[0]).toHaveTextContent(
                'dmco-question-2-document-1'
            )
            expect(outstandingRounds[0]).toHaveTextContent(
                'dmco-question-2-document-2'
            )

            // expect 4 answered rounds
            expect(answeredRounds).toHaveLength(4)

            // expect rounds in order of latest round to earliest with correct content
            expect(answeredRounds[0]).toHaveTextContent(
                'Asked by: Office of the Actuary (OACT)'
            )
            expect(answeredRounds[0]).toHaveTextContent(
                'oact-question-2-document-1'
            )
            expect(answeredRounds[0]).toHaveTextContent(
                'response-to-oact-2-document-1'
            )

            expect(answeredRounds[1]).toHaveTextContent(
                'Asked by: Division of Managed Care Operations (DMCO)'
            )
            expect(answeredRounds[1]).toHaveTextContent(
                'dmco-question-1-document-1'
            )
            expect(answeredRounds[1]).toHaveTextContent(
                'response-to-dmco-1-document-1'
            )

            expect(answeredRounds[2]).toHaveTextContent(
                'Asked by: Division of Managed Care Policy (DMCP)'
            )
            expect(answeredRounds[2]).toHaveTextContent(
                'dmcp-question-1-document-1'
            )
            expect(answeredRounds[2]).toHaveTextContent(
                'response-to-dmcp-1-document-1'
            )

            expect(answeredRounds[3]).toHaveTextContent(
                'Asked by: Office of the Actuary (OACT)'
            )
            expect(answeredRounds[3]).toHaveTextContent(
                'oact-question-1-document-1'
            )
            expect(answeredRounds[3]).toHaveTextContent(
                'response-to-oact-1-document-1'
            )

            const addResponse = screen.getAllByRole('link', {
                name: 'Upload response',
            })
            expect(addResponse).toHaveLength(5)
        })

        it('does not render the Upload response button for an approved contract', async () => {
            const approvedContract = mockContractPackageSubmittedWithQuestions()
            approvedContract.consolidatedStatus = 'APPROVED'
            approvedContract.reviewStatus = 'APPROVED'
            renderWithProviders(
                <Routes>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContractPackageApprovedWithQuestions(),
                                    id: 'test-abc-123',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/test-abc-123/question-and-answers',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: `Outstanding questions`,
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: `Answered questions`,
                    })
                ).toBeInTheDocument()
            })

            const addResponse = screen.queryByRole('link', {
                name: 'Upload response',
            })
            expect(addResponse).not.toBeInTheDocument()
        })

        it('renders error page if contract is in draft', async () => {
            const contract = mockContractPackageDraft()
            renderWithProviders(<CommonStateRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...contract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...contract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/question-and-answers',
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })

        it('renders error page if contract revision does not exist', async () => {
            const draftContract = mockContractPackageDraft()
            renderWithProviders(<CommonStateRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/question-and-answers',
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })
    })

    describe('CMS user tests', () => {
        const CommonCMSRoutes = () => (
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                </Route>
            </Routes>
        )
        it('renders no questions text', async () => {
            const indexContractQuestions: IndexContractQuestionsPayload = {
                __typename: 'IndexContractQuestionsPayload',
                DMCOQuestions: {
                    __typename: 'ContractQuestionList',
                    totalCount: 0,
                    edges: [],
                },
                DMCPQuestions: {
                    __typename: 'ContractQuestionList',
                    totalCount: 0,
                    edges: [],
                },
                OACTQuestions: {
                    __typename: 'ContractQuestionList',
                    totalCount: 0,
                    edges: [],
                },
            }
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: 'test-contract-id',
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageSubmittedWithQuestions(),
                                id: 'test-contract-id',
                                questions: indexContractQuestions,
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageSubmittedWithQuestions(),
                                id: 'test-contract-id',
                                questions: indexContractQuestions,
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/test-contract-id/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText("Your division's questions")
                ).toBeInTheDocument()
            })

            expect(
                screen.getAllByText('No questions have been submitted yet.')
            ).toHaveLength(2)
        })
        it('renders questions in correct sections', async () => {
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: 'test-contract-id',
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageSubmittedWithQuestions(),
                                id: 'test-contract-id',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageSubmittedWithQuestions(),
                                id: 'test-contract-id',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/test-contract-id/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText("Your division's questions")
                ).toBeInTheDocument()
            })

            // expect two DMCO questions in your division's questions section
            const yourDivisionSection = within(
                screen.getByTestId('usersDivisionQuestions')
            )
            const yourDivisionRounds = yourDivisionSection.getAllByTestId(
                'questionResponseRound'
            )

            // expect two rounds of questions for current user
            expect(yourDivisionRounds).toHaveLength(2)

            // expect the latest to have DMCO question 2 documents
            expect(yourDivisionRounds[0]).toHaveTextContent('Round 2')
            expect(yourDivisionRounds[0]).toHaveTextContent(
                'dmco-question-2-document-1'
            )
            expect(yourDivisionRounds[0]).toHaveTextContent(
                'dmco-question-2-document-2'
            )

            // expect the earliest to have DMCO question 1 documents
            expect(yourDivisionRounds[1]).toHaveTextContent('Round 1')
            expect(yourDivisionRounds[1]).toHaveTextContent(
                'dmco-question-1-document-1'
            )
            expect(yourDivisionRounds[1]).toHaveTextContent(
                'response-to-dmco-1-document-1'
            )

            // expect three questions in other division's questions section in correct order
            const otherDivisionSection = within(
                screen.getByTestId('otherDivisionQuestions')
            )
            const otherDivisionRounds = otherDivisionSection.getAllByTestId(
                'questionResponseRound'
            )

            // expect three question rounds
            expect(otherDivisionRounds).toHaveLength(3)

            // expect latest round to be round 2 with OACT question 2 documents
            expect(otherDivisionRounds[0]).toHaveTextContent('Round 2')
            expect(otherDivisionRounds[0]).toHaveTextContent(
                'oact-question-2-document-1'
            )
            expect(otherDivisionRounds[0]).toHaveTextContent(
                'response-to-oact-2-document-1'
            )

            // expect next round to be round 1 with DMCP question
            expect(otherDivisionRounds[1]).toHaveTextContent('Round 1')
            expect(otherDivisionRounds[1]).toHaveTextContent(
                'dmcp-question-1-document-1'
            )
            expect(otherDivisionRounds[1]).toHaveTextContent(
                'response-to-dmcp-1-document-1'
            )

            // expect next round (last round) to also be round 1 with OACT question 1
            expect(otherDivisionRounds[2]).toHaveTextContent('Round 1')
            expect(otherDivisionRounds[2]).toHaveTextContent(
                'oact-question-1-document-1'
            )
            expect(otherDivisionRounds[2]).toHaveTextContent(
                'response-to-oact-1-document-1'
            )

            // ability to add questions should exist for non approved contracts
            const addQuestion = await screen.findByRole('link', {
                name: 'Add questions',
            })
            expect(addQuestion).toBeInTheDocument()
        })

        it('does not render an Add questions button for an approved contract', async () => {
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: 'test-contract-id',
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageApprovedWithQuestions(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...mockContractPackageApprovedWithQuestions(),
                                id: 'test-abc-123',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/test-abc-123/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText("Your division's questions")
                ).toBeInTheDocument()
            })

            // ability to add questions should not exist for approved contracts
            const addQuestion = await screen.queryByRole('link', {
                name: 'Add questions',
            })
            expect(addQuestion).not.toBeInTheDocument()
        })

        it('renders with question submit banner after question submitted', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContractPackageSubmittedWithQuestions(),
                                    id: 'test-contract-id',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContractPackageSubmittedWithQuestions(),
                                    id: 'test-contract-id',
                                    contractSubmissionType: 'HEALTH_PLAN',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/health-plan/test-contract-id/question-and-answers?submit=question`,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByText("Your division's questions")
                ).toBeInTheDocument()
            })
            expect(screen.getByTestId('alert')).toHaveClass(
                'usa-alert--success'
            )
            expect(screen.getByText('Questions sent')).toBeInTheDocument()
        })
        it('renders error page if contract revision does not exist', async () => {
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/not-real/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })
        it('renders error page if contract is in draft', async () => {
            const contract = mockContractPackageDraft()
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/${contract.id}/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })
        it('renders warning banner if CMS user has no assigned division', async () => {
            const contract = mockContractPackageSubmittedWithQuestions()
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser({
                                divisionAssignment: null,
                            }),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/${contract.id}/question-and-answers`,
                },
            })

            await waitFor(() => {
                expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            })

            // Expect missing division text
            expect(screen.getByText('Missing division')).toBeInTheDocument()

            // Expect add questions button to not exist
            expect(
                screen.queryByRole('button', { name: 'Add questions' })
            ).toBeNull()
        })
    })
})
