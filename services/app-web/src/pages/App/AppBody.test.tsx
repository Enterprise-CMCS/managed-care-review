import { screen, waitFor } from '@testing-library/react'

import {
    renderWithProviders,
    userClickSignIn,
} from '../../testHelpers/jestHelpers'
import { AppBody } from './AppBody'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloHelpers'

test.todo(
    'App displays ErrorBoundary fallback component when there is JS error on page'
)

window.scrollTo = jest.fn()

describe('App Body and routes', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })

    it('App renders without errors', () => {
        renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
    })

    describe('/', () => {
        it('display dashboard when logged in', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
            })

            expect(
                screen.queryByRole('heading', { level: 1 })
            ).toBeInTheDocument()
            await waitFor(() => {
                expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
                expect(
                    screen.queryByRole('heading', {
                        name: /Page not found/i,
                    })
                ).toBeNull()
            })
        })

        it('display landing page when logged out', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
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
                    name: /You can use MC-Review to submit:/i,
                    level: 2,
                })
            ).toBeInTheDocument()
        })
    })

    describe('/auth', () => {
        it('when app loads at /auth route, Auth header is displayed', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
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

        it('when user clicks Sign In link, redirects to /auth', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await waitFor(() => {
                userClickSignIn(screen)
            })

            expect(
                screen.getByRole('heading', { name: /Auth Page/i, level: 2 })
            ).toBeInTheDocument()
        })

        it('display local login page when expected', async () => {
            renderWithProviders(<AppBody authMode={'LOCAL'} />)

            await waitFor(() => {
                userClickSignIn(screen)
            })

            expect(
                screen.getByRole('heading', {
                    name: /Local Login/i,
                    level: 3,
                })
            ).toBeInTheDocument()
        })

        it('display cognito signup page when expected', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await waitFor(() => {
                userClickSignIn(screen)
            })

            expect(
                screen.getByRole('textbox', { name: 'First Name' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('textbox', { name: 'Last Name' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()
        })
    })

    describe('page scrolling', () => {
        it('scroll top on page load', async () => {
            renderWithProviders(<AppBody authMode={'LOCAL'} />)
            await waitFor(() => {
                userClickSignIn(screen)
            })
            expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
        })
    })

    describe('invalid routes', () => {
        it('redirect to landing page when logged out', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
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
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
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
