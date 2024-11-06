//@eslint-gignore  jest/no-disabled-tests
import {
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockValidCMSUser,
    mockValidStateUser,
    rateDataMock,
} from '../../../testHelpers/apolloMocks'
import { IndexRateQuestionsPayload, RateRevision } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../../SubmissionSideNav'
import { RoutesRecord } from '../../../constants'
import { ContractQuestionResponse } from './ContractQuestionResponse'
import { RateSummary, SubmissionSummary } from '../../SubmissionSummary'
import { RateQuestionResponse } from './RateQuestionResponse'
import { screen, waitFor, within } from '@testing-library/react'
import { fetchRateWithQuestionsMockSuccess } from '../../../testHelpers/apolloMocks'
import { RateSummarySideNav } from '../../SubmissionSideNav/RateSummarySideNav'

describe('RateQuestionResponse', () => {
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
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                        }
                        element={<RateQuestionResponse />}
                    />
                </Route>
            </Routes>
        )
        it('renders rate certification name', async () => {
            const contract = mockContractPackageSubmitted()
            const rateRevision = contract.packageSubmissions[0].rateRevisions[0]
            const secondRateRev: RateRevision = {
                ...rateRevision,
                id: 'second-rate-revision',
                rateID: 'second-rate',
                formData: {
                    ...rateRevision.formData,
                    rateProgramIDs: ['ea16a6c0-5fc6-4df8-adac-c627e76660ab'],
                    rateCertificationName: 'MCR-MN-MSC+',
                },
            }
            contract.packageSubmissions[0].rateRevisions.push(secondRateRev)
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
                            },
                        }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: { id: secondRateRev.rateID },
                            rateRev: secondRateRev,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/rates/second-rate/question-and-answers',
                },
                featureFlags: {
                    'qa-by-rates': true,
                },
            })

            // Wait for sidebar nav to exist.
            await waitFor(() => {
                expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            })

            expect(
                screen.getByRole('heading', {
                    name: `Rate questions: ${secondRateRev.formData.rateCertificationName}`,
                })
            ).toBeInTheDocument()
        })

        it('renders questions in correct sections', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                        }
                        element={<RateQuestionResponse />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: 'test-rate-id',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/rates/test-rate-id/question-and-answers',
                    },
                    featureFlags: {
                        'qa-by-rates': true,
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
                'dmco-question-1-document-1'
            )

            // expect 4 answered rounds
            expect(answeredRounds).toHaveLength(4)

            // expect rounds in order of latest round to earliest with correct content
            expect(answeredRounds[0]).toHaveTextContent(
                'Asked by: Division of Managed Care Operations (DMCO)'
            )
            expect(answeredRounds[0]).toHaveTextContent(
                'dmco-question-2-document-1'
            )
            expect(answeredRounds[0]).toHaveTextContent(
                'dmco-question-2-document-2'
            )
            expect(answeredRounds[0]).toHaveTextContent(
                'response-to-dmco-2-document-1'
            )

            expect(answeredRounds[1]).toHaveTextContent(
                'Asked by: Office of the Actuary (OACT)'
            )
            expect(answeredRounds[1]).toHaveTextContent(
                'oact-question-2-document-1'
            )
            expect(answeredRounds[1]).toHaveTextContent(
                'response-to-oact-2-document-1'
            )

            expect(answeredRounds[2]).toHaveTextContent(
                'Asked by: Office of the Actuary (OACT)'
            )
            expect(answeredRounds[2]).toHaveTextContent(
                'oact-question-1-document-1'
            )
            expect(answeredRounds[2]).toHaveTextContent(
                'response-to-oact-1-document-1'
            )

            expect(answeredRounds[3]).toHaveTextContent(
                'Asked by: Division of Managed Care Policy (DMCP)'
            )
            expect(answeredRounds[3]).toHaveTextContent(
                'dmcp-question-1-document-1'
            )
            expect(answeredRounds[3]).toHaveTextContent(
                'response-to-dmcp-1-document-1'
            )
        })

        it('renders error page if rate is in draft', async () => {
            const contract = mockContractPackageSubmitted()
            contract.packageSubmissions[0].rateRevisions = []
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
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/rates/second-rate/question-and-answers',
                },
                featureFlags: {
                    'qa-by-rates': true,
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })

        it('renders error page if rate revision does not exist', async () => {
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
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/rates/second-rate/question-and-answers',
                },
                featureFlags: {
                    'qa-by-rates': true,
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
        it('renders no questions text', async () => {
            const indexRateQuestions: IndexRateQuestionsPayload = {
                __typename: 'IndexRateQuestionsPayload',
                DMCOQuestions: {
                    __typename: 'RateQuestionList',
                    totalCount: 0,
                    edges: [],
                },
                DMCPQuestions: {
                    __typename: 'RateQuestionList',
                    totalCount: 0,
                    edges: [],
                },
                OACTQuestions: {
                    __typename: 'RateQuestionList',
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
                            id: 'test-rate-id',
                        }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: 'test-rate-id',
                                questions: indexRateQuestions,
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/rates/test-rate-id/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
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
                            id: 'test-rate-id',
                        }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: 'test-rate-id',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/rates/test-rate-id/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
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
            expect(yourDivisionRounds[0]).toHaveTextContent(
                'response-to-dmco-2-document-1'
            )

            // expect the earliest to have DMCO question 1 documents
            expect(yourDivisionRounds[1]).toHaveTextContent('Round 1')
            expect(yourDivisionRounds[1]).toHaveTextContent(
                'dmco-question-1-document-1'
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

            // expect round 1 with OACT question 1
            expect(otherDivisionRounds[1]).toHaveTextContent('Round 1')
            expect(otherDivisionRounds[1]).toHaveTextContent(
                'oact-question-1-document-1'
            )
            expect(otherDivisionRounds[1]).toHaveTextContent(
                'response-to-oact-1-document-1'
            )

            // expect last question in round 1 to be DMCP question
            expect(otherDivisionRounds[2]).toHaveTextContent('Round 1')
            expect(otherDivisionRounds[2]).toHaveTextContent(
                'dmcp-question-1-document-1'
            )
            expect(otherDivisionRounds[2]).toHaveTextContent(
                'response-to-dmcp-1-document-1'
            )
        })
        it('renders with question submit banner after question submitted', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS}
                        element={<RateQuestionResponse />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: 'test-rate-id',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/rates/test-rate-id/question-and-answers?submit=question`,
                    },
                    featureFlags: {
                        'qa-by-rates': true,
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
        it('renders error page if rate revision does not exist', async () => {
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
                    route: `/rates/not-real/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })
        it('renders error page if rate is in draft', async () => {
            const rate = rateDataMock({}, { status: 'DRAFT' })
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess(rate),
                        fetchRateWithQuestionsMockSuccess({ rate }),
                    ],
                },
                routerProvider: {
                    route: `/rates/${rate.id}/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
                },
            })

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })
        it('renders waring banner if CMS user has no assigned division', async () => {
            const rate = rateDataMock()
            renderWithProviders(<CommonCMSRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser({
                                divisionAssignment: undefined,
                            }),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess(rate),
                        fetchRateWithQuestionsMockSuccess({ rate }),
                    ],
                },
                routerProvider: {
                    route: `/rates/${rate.id}/question-and-answers`,
                },
                featureFlags: {
                    'qa-by-rates': true,
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
