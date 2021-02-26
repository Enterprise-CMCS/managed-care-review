import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, userClickByTestId } from '../../utils/jestUtils'
import { Auth } from './Auth'
import { HELLO_WORLD } from '../../api'

/*  TODO: Where will we test:
    - bad internet connection
    - bad auth (403)
    - server error (500)
*/

describe('Auth', () => {
    describe('cognito login', () => {
        it.todo('displays login forms when logged out')
        it.todo('when login is clicked, button is disabled while loading')
        it.todo('when login is successful redirects to dashboard')
        it.todo('when login fails, display error alert')
        it.todo('when login fails, button is enabled.')
    })

    describe('local login', () => {
        afterEach(() => {
            window.localStorage.clear()
        })

        const successfulLoginMock = {
            request: { query: HELLO_WORLD },
            result: {
                data: {
                    hello: {
                        email: 'toph@dmas.virginia.gov',
                        name: 'Toph',
                        role: 'STATE_USER',
                        state: 'VA',
                    },
                },
            },
        }
        // use local storage mock
        it('displays ang and toph when logged out', () => {
            renderWithProviders(<Auth />, {
                authProvider: { localLogin: true },
            })

            expect(
                screen.getByRole('img', {
                    name: /Aang/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('img', {
                    name: /Toph/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getAllByRole('button', {
                    name: /Login/i,
                }).length
            ).toBe(2)
        })
        it('when toph is clicked, sets user in local storage', () => {
            renderWithProviders(<Auth />, {
                authProvider: { localLogin: true },
            })
            expect(window.localStorage.localUser).toBeUndefined()

            userClickByTestId(screen, 'TophButton')

            expect(window.localStorage.localUser).toBe(
                '{"email":"toph@dmas.virginia.gov","name":"Toph","role":"STATE_USER","state":"VA"}'
            )
        })

        it.todo(
            'when toph is clicked, checks auth with cognito-authentication-provider header'
        )

        it.skip('when login is successful, redirect to dashboard', async () => {
            renderWithProviders(<Auth />, {
                routerProvider: { route: '/auth' },
                authProvider: { localLogin: true },
                apolloProvider: { mocks: [successfulLoginMock] },
            })
            userClickByTestId(screen, 'TophButton')

            expect(window.localStorage.localUser).toBe(
                '{"email":"toph@dmas.virginia.gov","name":"Toph","role":"STATE_USER","state":"VA"}'
            )

            console.log(window.history)

            await waitFor(() => {
                expect(screen.getByTestId('dashboardPage')).toBeInTheDocument()
                expect(
                    screen.getByRole('textbox', { name: /Hello Toph/i })
                ).toBeInTheDocument()
            })
        })

        it.todo('when login fails, display error alert')
    })
})
