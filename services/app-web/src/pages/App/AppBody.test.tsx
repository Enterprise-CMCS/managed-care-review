import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import {
    renderWithProviders,
    userClickSignIn,
} from '../../testHelpers/jestHelpers'
import { AppBody } from './AppBody'
import {
    fetchCurrentUserMock,
    indexSubmissionsMockSuccess,
} from '../../testHelpers/apolloHelpers'
test('App renders without errors', () => {
    renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
})

test.todo(
    'App displays ErrorBoundary fallback component when there is JS error on page'
)

describe('App Body and routes', () => {
    describe('/', () => {
        it('display dashboard when logged in', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexSubmissionsMockSuccess(),
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
                    name: /You can submit capitation rates and contracts/i,
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
