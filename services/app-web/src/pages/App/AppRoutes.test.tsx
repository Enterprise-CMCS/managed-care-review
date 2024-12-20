import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AppRoutes } from './AppRoutes'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    indexContractsMockSuccess,
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
    describe('/[root]', () => {
        it('state dashboard when state user logged in', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect(
                    screen.getByTestId('state-dashboard-page')
                ).toBeInTheDocument()
                expect(
                    screen.queryByRole('heading', {
                        level: 2,
                        name: /Submissions/,
                    })
                ).toBeInTheDocument()
            })
        })

        it('cms dashboard when cms user logged in', async () => {
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                        indexContractsMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            await waitFor(() => {
                expect(
                    screen.getByTestId('cms-dashboard-page')
                ).toBeInTheDocument()
                expect(
                    screen.queryByRole('heading', {
                        level: 2,
                        name: /Submissions/,
                    })
                ).toBeInTheDocument()
            })
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
