import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AppRoutes } from './AppRoutes'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    fetchRateWithQuestionsMockSuccess,
    mockValidCMSUser,
    indexContractsStrippedMockSuccess,
} from '@mc-review/mocks'

// Routing and routes configuration tested here, best layer for testing behaviors that cross several pages
describe('AppRoutes and routing configuration', () => {
    Object.defineProperty(window, 'scrollTo', {
        writable: true,
        value: vi.fn(),
    })
    afterEach(() => {
        vi.resetAllMocks()
    })
    afterAll(() => {
        vi.clearAllMocks()
    })

    const expectContactUsPage = () => {
        expect(
            screen.getByRole('heading', {
                name: /Contact us/i,
                level: 1,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', {
                name: /FAQ page/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/resources-for-states/managed-care-review-mc-review/managed-care-review-faqs'
        )
        expect(
            screen.getByRole('link', {
                name: /MCGDMCOactions@cms\.hhs\.gov/i,
            })
        ).toHaveAttribute('href', 'mailto:MCGDMCOactions@cms.hhs.gov')
        expect(
            screen.getByRole('link', {
                name: /MC_Review_HelpDesk@cms\.hhs\.gov/i,
            })
        ).toHaveAttribute('href', 'mailto:MC_Review_HelpDesk@cms.hhs.gov')
    }

    const expectSubmissionFormGuidancePage = () => {
        expect(
            screen.getByRole('heading', {
                name: /Submission form guidance/i,
                level: 1,
            })
        ).toBeInTheDocument()
    }

    const expectResourcesTrainingPage = () => {
        expect(
            screen.getByRole('heading', {
                name: /Resources and training/i,
                level: 1,
            })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('link', {
                name: /State user manual \(opens in new window\)/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user-manul.pdf'
        )

        expect(
            screen.getByRole('link', {
                name: /Account creation user manual \(opens in new window\)/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user.pdf'
        )

        expect(
            screen.getByRole('link', {
                name: /State Guide to CMS Criteria for Medicaid Managed Care Contract Review and Approval \(opens in new window\)/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/medicaid/downloads/mce-checklist-state-user-guide.pdf'
        )

        expect(
            screen.getByRole('link', {
                name: /Medicaid Managed Care Rate Development Guide \(opens in new window\)/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides'
        )

        expect(
            screen.getByRole('link', {
                name: /MC-Review training webinar recording \(opens in new window\)/i,
            })
        ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=1d-f0pnLLLE')

        expect(
            screen.getByRole('link', {
                name: /MC-Review training webinar - Slide deck \(opens in new window\)/i,
            })
        ).toHaveAttribute(
            'href',
            'https://www.medicaid.gov/medicaid/managed-care/mc-rvw-state-wbnr-sprng-2024.pdf'
        )
    }

    const expect404Page = () => {
        expect(
            screen.getByRole('heading', {
                name: /Page not found/i,
                level: 1,
            })
        ).toBeInTheDocument()
    }

    describe('/[root]', () => {
        it('state dashboard when state user logged in', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsStrippedMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            expect(
                await screen.findByTestId('state-dashboard-page')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', {
                    level: 1,
                    name: 'Dashboard',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('link', {
                    name: 'Start new submission',
                })
            ).toBeInTheDocument()
        })

        it('cms dashboard when cms user logged in', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                        indexContractsStrippedMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            expect(
                await screen.findByTestId('cms-dashboard-page')
            ).toBeInTheDocument()
            expect(
                screen.queryByTestId('submission-name')
            ).not.toBeInTheDocument()
            expect(
                await screen.findByTestId('cms-submissions-heading')
            ).toHaveTextContent('Submissions')
            expect(
                screen.getByRole('tab', {
                    name: 'Submissions',
                })
            ).toBeInTheDocument()
        })

        it('landing page when no user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /How it works/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', {
                    name: /Submit your managed care health plans to CMS for review/i,
                    level: 2,
                })
            ).toBeInTheDocument()
        })
    })

    describe('/auth', () => {
        it('auth header is displayed', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/auth' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Auth Page/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
            expect(
                screen.queryByRole('heading', {
                    name: /How it works/i,
                    level: 2,
                })
            ).toBeNull()
        })
    })

    describe('/resources/help', () => {
        it('can be accessed by state user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await screen.findByTestId('help-authenticated')
            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })

        it('can be accessed by CMS user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })
            await screen.findByTestId('help-authenticated')
            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })

        it('can be accessed by unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
            })

            await screen.findByTestId('help-unauthenticated')
            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })
    })

    describe('/help', () => {
        it('shows 404 page for state users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })

        it('shows 404 page for CMS users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })

        it('shows 404 page for unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })
    })

    describe('/contact-us', () => {
        it('can be accessed by state user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/contact-us' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectContactUsPage()
            })
        })

        it('can be accessed by CMS user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/contact-us' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectContactUsPage()
            })
        })

        it('can be accessed by unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/contact-us' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'resources-nav-pages': true },
            })

            await waitFor(() => {
                expectContactUsPage()
            })
        })

        it('shows 404 page when feature flag is off', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/contact-us' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': false,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Page not found/i,
                        level: 1,
                    })
                ).toBeInTheDocument()
            })
        })
    })

    describe('CMS upload question routes', () => {
        it('shows 404 page when a DMCP user enters the contract upload questions URL', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/question-and-answers/dmcp/upload-questions',
                },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser({
                                divisionAssignment: 'DMCP',
                            }),
                        }),
                        fetchContractWithQuestionsMockSuccess({}),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })

        it('shows 404 page when an OACT user enters the contract upload questions URL', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: {
                    route: '/submissions/health-plan/test-abc-123/question-and-answers/dmco/upload-questions',
                },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }),
                        }),
                        fetchContractWithQuestionsMockSuccess({}),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })

        it('shows 404 page when a DMCO user enters the rate upload questions URL with a non-DMCO division', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: {
                    route: '/rates/rate-123/question-and-answers/dmcp/upload-questions',
                },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser({
                                divisionAssignment: 'DMCO',
                            }),
                        }),
                        fetchRateWithQuestionsMockSuccess({}),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })
    })

    describe('/resources', () => {
        it('can be accessed by state user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })

        it('can be accessed by CMS user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })

        it('can be accessed by unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'resources-nav-pages': true },
            })

            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
        })

        it('shows Submission form guidance without sidenav when feature flag is off', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': false,
                },
            })

            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
            expect(screen.queryByTestId('sidenav')).not.toBeInTheDocument()
        })
    })

    describe('/resources/training', () => {
        it('can be accessed by state user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/training' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectResourcesTrainingPage()
            })
        })

        it('can be accessed by CMS user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/training' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': true,
                },
            })

            await waitFor(() => {
                expectResourcesTrainingPage()
            })
        })

        it('can be accessed by unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/training' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'resources-nav-pages': true },
            })

            await waitFor(() => {
                expectResourcesTrainingPage()
            })
        })

        it('shows 404 page when feature flag is off', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/training' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': false,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Page not found/i,
                        level: 1,
                    })
                ).toBeInTheDocument()
            })
        })
    })

    describe('/resources/help link', () => {
        it('shows Submission form guidance without sidenav when feature flag is off', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/resources/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {
                    'session-expiring-modal': false,
                    'resources-nav-pages': false,
                },
            })

            await waitFor(() => {
                expectSubmissionFormGuidancePage()
            })
            expect(screen.queryByTestId('sidenav')).not.toBeInTheDocument()
        })
    })

    describe('invalid routes', () => {
        it('shows 404 page when no user', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/not-a-real-place' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 403,
                        }),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect404Page()
            })
        })

        it('redirect to 404 error page when user is logged in', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/not-a-real-place' },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() =>
                expect(
                    screen.getByRole('heading', {
                        name: /Page not found/i,
                        level: 1,
                    })
                ).toBeInTheDocument()
            )
        })
    })
})
