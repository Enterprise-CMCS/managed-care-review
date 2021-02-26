import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, userClickSignIn } from '../../utils/jestUtils'
import { AppBody } from './AppBody'
import { HELLO_WORLD } from '../../api'

const successfulLoginMock = {
    request: { query: HELLO_WORLD },
    result: {
        data: {
            hello: {
                state: 'VA',
                role: 'State User',
                name: 'Bob it user',
                email: 'bob@dmas.mn.gov',
            },
        },
    },
}

test('App renders without errors', () => {
    renderWithProviders(<AppBody />, {})
    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
})

describe('Routing', () => {
    describe('/', () => {
        it('display dashboard when logged in', async () => {
            renderWithProviders(<AppBody />, {
                apolloProvider: { mocks: [successfulLoginMock] },
            })

            expect(
                screen.queryByRole('heading', { level: 1 })
            ).toBeInTheDocument()
            await waitFor(() =>
                expect(screen.getByTestId('dashboardPage')).toBeInTheDocument()
            )
        })

        it('display landing page when logged out', () => {
            renderWithProviders(<AppBody />, {})

            expect(
                screen.getByRole('heading', { name: /How it works/i, level: 2 })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', {
                    name: /In this system, pilot state users can/i,
                    level: 2,
                })
            ).toBeInTheDocument()
        })
    })

    describe('/auth', () => {
        it('when app loads at /auth route, Login Page header is displayed', () => {
            renderWithProviders(<AppBody />, {
                routerProvider: { route: '/auth' },
            })

            expect(
                screen.getByRole('heading', { name: /Login/i, level: 2 })
            ).toBeInTheDocument()
        })
        it('when user clicks Sign In link, redirects to /auth', () => {
            renderWithProviders(<AppBody />, {})
            userClickSignIn(screen)

            expect(
                screen.getByRole('heading', { name: /Login/i, level: 2 })
            ).toBeInTheDocument()
        })

        it('display local login page when expected', async () => {
            renderWithProviders(<AppBody />, {
                authProvider: { localLogin: true },
            })

            userClickSignIn(screen)

            expect(
                screen.getByRole('heading', {
                    name: /Local Login/i,
                    level: 3,
                })
            ).toBeInTheDocument()
        })

        it('display cognito login page when expected', () => {
            renderWithProviders(<AppBody />, {})
            userClickSignIn(screen)

            expect(
                screen.getByRole('textbox', { name: 'First Name' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('textbox', { name: 'Last Name' })
            ).toBeInTheDocument()
            expect(screen.getByRole('form')).toBeInTheDocument()
        })
    })

    describe('invalid routes', () => {
        it('redirect to landing page when logged out', () => {
            renderWithProviders(<AppBody />, {
                routerProvider: { route: '/not-a-real-place' },
            })
            expect(
                screen.getByRole('heading', { name: /How it works/i, level: 2 })
            ).toBeInTheDocument()
        })
        it.todo('display 404 error page when logged in')
    })
})
