import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor, Screen, queries } from '@testing-library/react'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'

import * as CognitoAuthApi from '../Auth/cognitoAuth'
import {
    renderWithProviders,
    userClickByTestId,
    userClickByRole,
} from '../../utils/jestUtils'
import { Auth } from './Auth'
import {
    mockGetCurrentUser200,
    mockGetCurrentUser403,
} from '../../utils/apolloUtils'
/*  
This file should only have basic user flows for auth. Form and implementation details are tested at the component level.

TODO: Where will we test:
    - bad internet connection
    - bad auth (403)
    - server error (500)
*/

describe('Auth', () => {
    describe('Cognito Login', () => {
        const userLogin = async (screen: Screen<typeof queries>) => {
            userClickByRole(screen, 'button', { name: 'Show Login Form' })
            const loginEmail = screen.getByTestId('loginEmail')
            const loginPassword = screen.getByTestId('loginPassword')

            userEvent.type(loginEmail, 'countdracula@muppets.com')
            userEvent.type(loginPassword, 'passwordABC')
            await waitFor(() =>
                expect(
                    screen.getByRole('button', { name: 'Login' })
                ).not.toBeDisabled()
            )
            userClickByRole(screen, 'button', { name: 'Login' })
        }

        it('displays signup form when logged out', () => {
            renderWithProviders(<Auth />, {
                apolloProvider: { mocks: [mockGetCurrentUser403] },
            })

            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /SignUp/i })
            ).toBeInTheDocument()
        })

        it('show login button displays login form', async () => {
            renderWithProviders(<Auth />, {
                apolloProvider: { mocks: [mockGetCurrentUser403] },
            })

            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()

            userClickByRole(screen, 'button', { name: 'Show Login Form' })

            await waitFor(() => {
                expect(
                    screen.getByRole('form', { name: 'Login Form' })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('button', { name: /Login/i })
                ).toBeInTheDocument()
            })
        })

        it('when login is successful, redirect to dashboard', async () => {
            const loginSpy = jest
                .spyOn(CognitoAuthApi, 'signIn')
                .mockResolvedValue(
                    new CognitoUser({
                        Username: 'foo@example.com',
                        Pool: { getClientId: () => '7' } as CognitoUserPool,
                    })
                )
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                apolloProvider: {
                    mocks: [mockGetCurrentUser403, mockGetCurrentUser200],
                },
                routerProvider: { routerProps: { history: history } },
            })

            await userLogin(screen)

            await waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
            await waitFor(() =>
                expect(history.location.pathname).toBe('/dashboard')
            )
        })

        it('when login fails, stay on page and display error alert', async () => {
            const loginSpy = jest.spyOn(CognitoAuthApi, 'signIn')
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                apolloProvider: {
                    mocks: [
                        mockGetCurrentUser403,
                        mockGetCurrentUser403,
                        mockGetCurrentUser403,
                    ],
                },
                routerProvider: {
                    route: '/auth',
                    routerProps: { history: history },
                },
            })

            await userLogin(screen)
            await waitFor(() => {
                expect(loginSpy).toHaveBeenCalledTimes(1)
                expect(history.location.pathname).toBe('/auth')
            })
        })
    })

    describe('local login', () => {
        afterEach(() => {
            window.localStorage.clear()
        })

        it('displays ang and toph when logged out', () => {
            renderWithProviders(<Auth />, {
                apolloProvider: { mocks: [mockGetCurrentUser403] },
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

        it('when login is successful, redirect to dashboard', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                routerProvider: { routerProps: { history: history } },
                authProvider: { localLogin: true },
                apolloProvider: {
                    mocks: [mockGetCurrentUser403, mockGetCurrentUser200],
                },
            })

            userClickByTestId(screen, 'TophButton')

            await waitFor(() => {
                expect(history.location.pathname).toBe('/dashboard')
            })
        })

        it('when login fails, stay on page and display error alert', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<Auth />, {
                authProvider: { localLogin: true },
                apolloProvider: {
                    mocks: [mockGetCurrentUser403, mockGetCurrentUser403],
                },
                routerProvider: {
                    route: '/auth',
                    routerProps: { history: history },
                },
            })

            userClickByTestId(screen, 'TophButton')
            await waitFor(() => {
                expect(history.location.pathname).toBe('/auth')
            })
        })
    })
})
