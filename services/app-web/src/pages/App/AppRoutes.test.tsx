import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AppRoutes } from './AppRoutes'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloMocks'

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
                        indexHealthPlanPackagesMockSuccess(),
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
                        indexHealthPlanPackagesMockSuccess(),
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

    describe.todo('login, logout, and session timeout behaviors', () =>{
        it.todo('when login is successful, redirect to dashboard as display as logged in')
        it.todo('when logout is successful, redirect to landing page and display as logged out with no warning banners')
        it.skip("if user session times out, log out user and redirect to landing page with session expired banner", async () => {
                    const logoutSpy = vi
                    .spyOn(CognitoAuthApi, 'signOut')
                    .mockResolvedValue(null)
                    let testLocation: Location

                    renderWithProviders(
                            <AuthenticatedRouteWrapper
                            authMode="AWS_COGNITO"
                            children={<div>children go here</div>}
                        />,
                        {  featureFlags: {
                            'session-expiration-minutes': 2
                        }}
                    )

                        const dialogOnLoad = await screen.findByRole('dialog', {name: 'Session Expiring'})
                        expect(dialogOnLoad).toBeInTheDocument()
                        expect(dialogOnLoad).toHaveClass('is-hidden')

                        await act(() => vi.advanceTimersByTime(1000));
                        const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
                        expect(dialogAfterIdle).toHaveClass('is-visible')


                        await act(() => vi.advanceTimersByTime(2000));
                        await waitForElementToBeRemoved(() => screen.queryByRole('dialog', {name: 'Session Expiring'}))

                        // check that we redirected     to Landing page and we are signed out
                        // await waitFor(() => expect(testLocation.pathname).toBe('/'))
                        // expect(logoutSpy).toHaveBeenCalled()
                        const dialogAfterLogout = await screen.queryByRole('dialog', {name: 'Session Expiring'})
                        expect(dialogAfterLogout).toHaveClass('is-hidden')

                        // expect(screen.getByRole('link', {name:'Sign In'})).toBeInTheDocument()
                        // expect(screen.getByText('You have been logged out due to inactivity. Please sign in again.')).toBeInTheDocument();
                        // expect(screen.getByText('Submit your managed care health plans to CMS for review')).toBeInTheDocument();

        });
        it.todo('if user session goes idle, display session timeout modal and override the submit modal')
    })
})
