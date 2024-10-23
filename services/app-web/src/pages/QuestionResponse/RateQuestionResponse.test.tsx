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
} from '../../testHelpers/apolloMocks'
import { IndexRateQuestionsPayload, RateRevision } from '../../gen/gqlClient'
import { renderWithProviders } from '../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '../../constants'
import { QuestionResponse } from './QuestionResponse'
import { RateSummary, SubmissionSummary } from '../SubmissionSummary'
import { RateQuestionResponse } from './RateQuestionResponse'
import { screen, waitFor, within } from '@testing-library/react'
import { fetchRateWithQuestionsMockSuccess } from '../../testHelpers/apolloMocks'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'

describe('RateQuestionResponse', () => {
    describe('State user tests', () => {
        const CommonStateRoutes = () => (
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<QuestionResponse />}
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
            expect(yourDivisionSection.getByText('Round 2')).toBeInTheDocument()
            expect(yourDivisionSection.getAllByRole('table')).toHaveLength(2)

            // expect three questions in other division's questions section
            const otherDivisionSection = within(
                screen.getByTestId('otherDivisionQuestions')
            )
            expect(
                otherDivisionSection.getByText('DMCP - Round 1')
            ).toBeInTheDocument()
            expect(
                otherDivisionSection.getByText('OACT - Round 1')
            ).toBeInTheDocument()
            expect(
                otherDivisionSection.getByText('OACT - Round 2')
            ).toBeInTheDocument()
            expect(otherDivisionSection.getAllByRole('table')).toHaveLength(3)
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
