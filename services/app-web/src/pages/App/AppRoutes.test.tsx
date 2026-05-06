import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AppRoutes } from './AppRoutes'
import {
    fetchCurrentUserMock,
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

    describe('/help', () => {
        it('can be accessed by state user', async () => {
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

            await screen.findByTestId('help-authenticated')
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
        })

        it('can be accessed by CMS user', async () => {
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
            await screen.findByTestId('help-authenticated')
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
        })

        it('can be accessed by unauthenticated users', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/help' },
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
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
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
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
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
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
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
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
        })

        it('shows 404 page when feature flag is off', async () => {
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
                expect(
                    screen.getByRole('heading', {
                        name: /Help documentation/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
            expect(screen.queryByTestId('sidenav')).not.toBeInTheDocument()
        })
    })

    describe('invalid routes', () => {
        it('redirect to landing page when no user', async () => {
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
                expect(
                    screen.getByRole('heading', {
                        name: /How it works/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
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
