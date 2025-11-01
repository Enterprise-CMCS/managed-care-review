import { screen, waitFor, within } from '@testing-library/react'
import { Location, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { SubmissionSideNav } from './SubmissionSideNav'
import { SubmissionSummary } from '../SubmissionSummary'
import { ContractQuestionResponse } from '../QuestionResponse'
import { renderWithProviders } from '../../testHelpers'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockContractPackageSubmittedWithQuestions,
    mockQuestionsPayload,
    mockValidCMSUser,
    fetchContractWithQuestionsMockSuccess,
    fetchContractWithQuestionsMockFail,
    mockContractPackageDraft,
    mockValidStateUser,
} from '@mc-review/mocks'
import { RateRevision } from '../../gen/gqlClient'

const CommonRoutes = () => (
    <Routes>
        <Route element={<SubmissionSideNav />}>
            <Route
                path={RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS}
                element={<ContractQuestionResponse />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                element={<SubmissionSummary />}
            />
        </Route>
    </Routes>
)

describe('SubmissionSideNav', () => {
    it('loads sidebar nav with expected links for CMS user', async () => {
        const contract = mockContractPackageSubmitted()
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
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
                route: '/submissions/health-plan/15',
            },
        })

        // Wait for sidebar nav and sections to exist. Addresses test flakes to wait for these up front.
        await screen.findByTestId('sidenav')
        await screen.findByText(/Contract questions/)

        const withinSideNav = within(screen.getByTestId('sidenav'))

        // Expect to only have one back to dashboard link.
        expect(
            await screen.findAllByRole('link', { name: /Go to dashboard/ })
        ).toHaveLength(1)

        const summaryLink = withinSideNav.getByRole('link', {
            name: /Submission summary/,
        })
        const qaLink = withinSideNav.getByRole('link', {
            name: /Contract questions/,
        })

        // Expect submission summary link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        // Expect submission summary link to be currently selected and highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect submission summary link to have correct href url
        expect(summaryLink).toHaveAttribute(
            'href',
            '/submissions/health-plan/15'
        )

        // Expect Q&A link to exist within sidebar nav.
        expect(qaLink).toBeInTheDocument()
        // Expect Q&A link to not be currently selected
        expect(qaLink).not.toHaveClass('usa-current')
        // Expect Q&A link to have correct href url
        expect(qaLink).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/question-and-answers'
        )

        const rate1Link = withinSideNav.queryByRole('link', {
            name: /Rate questions: SNBC/,
        })
        // Expect no Q&A rate link to be on the page. CMS users only see this on rate summary page.
        expect(rate1Link).toBeNull()
    })

    it('loads sidebar nav with expected links for state user', async () => {
        const contract = mockContractPackageSubmitted()
        const rateRevision = contract.packageSubmissions[0].rateRevisions[0]
        const secondRate: RateRevision = {
            ...rateRevision,
            id: 'second-rate-revision',
            rateID: 'second-rate',
            formData: {
                ...rateRevision.formData,
                rateProgramIDs: ['ea16a6c0-5fc6-4df8-adac-c627e76660ab'],
            },
        }
        const thirdRate: RateRevision = {
            ...rateRevision,
            id: 'third-rate-revision',
            rateID: 'third-rate',
            formData: {
                ...rateRevision.formData,
                rateProgramIDs: [],
                deprecatedRateProgramIDs: [
                    '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                ],
            },
        }
        const fourthRate: RateRevision = {
            ...rateRevision,
            id: 'fourth-rate-revision',
            rateID: 'fourth-rate',
            formData: {
                ...rateRevision.formData,
                rateProgramIDs: [],
                deprecatedRateProgramIDs: [],
            },
        }
        contract.packageSubmissions[0].rateRevisions.push(secondRate)
        contract.packageSubmissions[0].rateRevisions.push(thirdRate)
        contract.packageSubmissions[0].rateRevisions.push(fourthRate)

        renderWithProviders(<CommonRoutes />, {
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
                ],
            },
            routerProvider: {
                route: '/submissions/health-plan/15',
            },
        })

        // Wait for sidebar nav and sections to exist. Addresses test flakes to wait for these up front.
        await screen.findByTestId('sidenav')
        await screen.findByText(/Contract questions/)
        await screen.findAllByText(/Rate questions/)

        const withinSideNav = within(screen.getByTestId('sidenav'))

        const summaryLink = withinSideNav.getByRole('link', {
            name: /Submission summary/,
        })

        // Expect submission summary link to exist within sidebar nav
        expect(summaryLink).toBeInTheDocument()
        // Expect submission summary link to be currently selected and highlighted
        expect(summaryLink).toHaveClass('usa-current')
        // Expect submission summary link to have correct href url
        expect(summaryLink).toHaveAttribute(
            'href',
            '/submissions/health-plan/15'
        )

        const qaLink = withinSideNav.getByRole('link', {
            name: /Contract questions/,
        })
        // Expect Q&A link to exist within sidebar nav.
        expect(qaLink).toBeInTheDocument()
        // Expect Q&A link to not be currently selected
        expect(qaLink).not.toHaveClass('usa-current')
        // Expect Q&A link to have correct href url
        expect(qaLink).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/question-and-answers'
        )

        const rate1Link = withinSideNav.getByRole('link', {
            name: /Rate questions: SNBC/,
        })
        // Expect first rate link to exist within sidebar nav.
        expect(rate1Link).toBeInTheDocument()
        // Expect first rate link to not be currently selected
        expect(rate1Link).not.toHaveClass('usa-current')
        // Expect first rate link to have correct href url
        expect(rate1Link).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/rates/123/question-and-answers'
        )

        const rate2Link = withinSideNav.getByRole('link', {
            name: /Rate questions: MSC+/,
        })
        // Expect second rate link to exist within sidebar nav.
        expect(rate2Link).toBeInTheDocument()
        // Expect second rate link to not be currently selected
        expect(rate2Link).not.toHaveClass('usa-current')
        // Expect second rate link to have correct href url
        expect(rate2Link).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/rates/second-rate/question-and-answers'
        )

        const rate3Link = withinSideNav.getByRole('link', {
            name: /Rate questions: MSHO/,
        })
        // Expect third rate link using depreciated rates to exist within sidebar nav.
        expect(rate3Link).toBeInTheDocument()
        // Expect second rate link using depreciated rates to not be currently selected
        expect(rate3Link).not.toHaveClass('usa-current')
        // Expect second rate link using depreciated rates to have correct href url
        expect(rate3Link).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/rates/third-rate/question-and-answers'
        )

        const rate4Link = withinSideNav.getByRole('link', {
            name: 'Rate questions: Unknown Program(s)',
        })
        // Expect fourth rate link falling back to UnknownProgram to exist within sidebar nav.
        expect(rate4Link).toBeInTheDocument()
        // Expect fourth rate link falling back to UnknownProgram to not be currently selected
        expect(rate4Link).not.toHaveClass('usa-current')
        // Expect fourth rate link falling back to UnknownProgram to have correct href url
        expect(rate4Link).toHaveAttribute(
            'href',
            '/submissions/health-plan/15/rates/fourth-rate/question-and-answers'
        )
    })

    it('sidebar nav links routes to correct pages', async () => {
        let testLocation: Location
        const contract = mockContractPackageSubmittedWithQuestions()
        contract.id = '15'
        contract.contractSubmissionType = 'HEALTH_PLAN'

        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/health-plan/15',
            },
            location: (location) => (testLocation = location),
        })

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
        const qaLink = withinSideNav.getByRole('link', {
            name: /Contract questions/,
        })

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
                `/submissions/health-plan/15/question-and-answers`
            )
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('heading', {
                    name: "Your division's questions",
                })
            ).toBeInTheDocument()
        })

        // Expect Q&A link to be selected and highlighted
        expect(qaLink).toHaveClass('usa-current')
        // Expect submission summary link to not be highlighted
        expect(summaryLink).not.toHaveClass('usa-current')

        // Navigate back to Submission summary page by link.
        await userEvent.click(summaryLink)
        await waitFor(() => {
            expect(testLocation.pathname).toBe(`/submissions/health-plan/15`)
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
            screen.getByRole('link', { name: /Go to dashboard/ })
        )
        await waitFor(() => {
            expect(testLocation.pathname).toBe(`/dashboard/submissions`)
        })
    })

    it('renders back to dashboard link for state users', async () => {
        const contract = mockContractPackageSubmitted()
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
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
                route: '/submissions/health-plan/15',
            },
        })
        expect(
            await screen.findByRole('link', { name: /Go to state dashboard/ })
        ).toBeInTheDocument()
    })

    it('renders back to dashboard link for CMS users', async () => {
        const contract = mockContractPackageSubmitted()
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
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
                route: '/submissions/health-plan/15',
            },
        })

        expect(
            await screen.findByRole('link', {
                name: /Go to dashboard/,
            })
        ).toBeInTheDocument()
    })

    describe('Submission package data display', () => {
        it('Submission with no revisions shows a generic error', async () => {
            const contract = mockContractPackageSubmitted()
            contract.packageSubmissions = []

            renderWithProviders(<CommonRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
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
                    route: '/submissions/health-plan/15',
                },
            })

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('DRAFT displays an error to a CMS user', async () => {
            const contract = mockContractPackageDraft()
            renderWithProviders(<CommonRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
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
                    route: '/submissions/health-plan/15',
                },
            })

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('shows a generic 404 page when package is not found', async () => {
            const contract = mockContractPackageSubmittedWithQuestions()

            renderWithProviders(<CommonRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...contract,
                            },
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: {
                                ...contract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                        fetchContractWithQuestionsMockFail({
                            id: '404',
                            error: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        }),
                    ],
                },
                routerProvider: { route: '/submissions/health-plan/404' },
            })

            const notFound = await screen.findByText('404 / Page not found')
            expect(notFound).toBeInTheDocument()
        })

        it('shows a generic error page when user is undefined', async () => {
            const testQuestions = mockQuestionsPayload('15')
            const contract = mockContractPackageSubmitted()
            contract.questions = testQuestions
            renderWithProviders(<CommonRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 403 }),
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

            expect(await screen.findByText('System error')).toBeInTheDocument()
        })
    })
})
