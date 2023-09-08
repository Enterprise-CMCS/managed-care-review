import { screen, waitFor } from '@testing-library/react'

import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { AppRoutes } from './AppRoutes'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloMocks'
import { AppBody } from './AppBody'

// Routing and routes configuration
describe('AppRoutes', () => {
    window.scrollTo = jest.fn()
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })
    describe('/[root]', () => {
        it('dashboard when state user logged in', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
            })

            await waitFor(() => {
                expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
                expect(
                    screen.queryByRole('heading', {
                        level: 2,
                        name: /Submissions/,
                    })
                ).toBeInTheDocument()
            })
        })

        it('landing page when logged out', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />)
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
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/auth' },
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/help' },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
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
                routerProvider: { route: '/help' },
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
    })

    describe('invalid routes', () => {
        it('redirect to landing page when logged out', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/not-a-real-place' },
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

        it('redirects to 404 error page when logged in', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppRoutes authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/not-a-real-place' },
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
