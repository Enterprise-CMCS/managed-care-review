import React from 'react'
<<<<<<< HEAD
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor, Screen, queries } from '@testing-library/react'

import * as CognitoAuthApi from '../Auth/cognitoAuth'
import {
    renderWithProviders,
    userClickByTestId,
    userClickByRole,
} from '../../utils/jestUtils'
import { Auth } from './Auth'

/*  
This file should only have basic user flows for auth. Form and implementation details are tested at the component level.

TODO: Where will we test:
=======
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, userClickByTestId } from '../../utils/jestUtils'
import { Auth } from './Auth'
import { HELLO_WORLD } from '../../api'

/*  TODO: Where will we test:
>>>>>>> origin/main
    - bad internet connection
    - bad auth (403)
    - server error (500)
*/

describe('Auth', () => {
<<<<<<< HEAD
    describe('Cognito Login', () => {
        const userLogin = (screen: Screen<typeof queries>) => {
            const loginEmail = screen.getByTestId('loginEmail')
            const loginPassword = screen.getByTestId('loginPassword')

            userEvent.type(loginEmail, 'countdracula@muppets.com')
            userEvent.type(loginPassword, 'passwordABC')
            userClickByRole(screen, 'button', { name: 'Login' })
        }
        it('displays login and signup forms when logged out', () => {
            renderWithProviders(<Auth />)

            expect(
                screen.getByRole('form', { name: 'Login Form' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /Login/i })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /SignUp/i })
            ).toBeInTheDocument()
        })

        it('when login is successful, redirect to dashboard', async () => {
            const loginSpy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
            })

            userLogin(screen)
            waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
            waitFor(() => expect(history.location.pathname).toBe('/dashboard'))
        })

        it('when login fails, stay on page and display error alert', () => {
            const loginSpy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockRejectedValue('Error has occured')

            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
            })

            userLogin(screen)
            waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
            waitFor(() => expect(history.location.pathname).toBe('/auth'))
        })
=======
    describe('cognito login', () => {
        it.todo('displays login forms when logged out')
        it.todo('when login is clicked, button is disabled while loading')
        it.todo('when login is successful redirects to dashboard')
        it.todo('when login fails, display error alert')
        it.todo('when login fails, button is enabled.')
>>>>>>> origin/main
    })

    describe('local login', () => {
        afterEach(() => {
            window.localStorage.clear()
        })

<<<<<<< HEAD
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD

        it('when login is successful, redirect to dashboard', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
                authProvider: { localLogin: true },
            })

            userClickByTestId(screen, 'TophButton')

            await waitFor(() => {
                expect(history.location.pathname).toBe('/dashboard')
            })

            waitFor(() =>
                expect(screen.getByTestId('dashboardPage')).toBeInTheDocument()
            )
        })

        it('when login fails, stay on page and display error alert', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
                authProvider: { localLogin: true },
            })

            userClickByTestId(screen, 'TophButton')

            waitFor(() => {
                expect(history.location.pathname).not.toBe('/dashboard')
                expect(history.location.pathname).toBe('/auth')
            })
        })
=======
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
>>>>>>> origin/main
    })
})
