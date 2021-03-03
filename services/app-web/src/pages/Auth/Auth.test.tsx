import React from 'react'
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
import { GetCurrentUserDocument } from '../../gen/gqlClient'

/*  
This file should only have basic user flows for auth. Form and implementation details are tested at the component level.

TODO: Where will we test:
    - bad internet connection
    - bad auth (403)
    - server error (500)
*/
const failedAuthMock = {
    request: { query: GetCurrentUserDocument },
    result: {
        ok: false,
        status: 403,
        statusText: 'Unauthenticated',
        data: {
            error: 'you are not logged in',
        },
        error: new Error('network error'),
    },
}

describe('Auth', () => {
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
    })

    describe('local login', () => {
        afterEach(() => {
            window.localStorage.clear()
        })

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

        it.only('when login is successful, redirect to dashboard', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
                authProvider: { localLogin: true },
                apolloProvider: { mocks: [failedAuthMock] },
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
    })
})
