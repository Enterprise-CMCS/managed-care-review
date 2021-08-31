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
} from '../../testHelpers/jestHelpers'
import { CognitoLogin } from './CognitoLogin'
import { LocalLogin } from './LocalLogin'
import { fetchCurrentUserMock } from '../../testHelpers/apolloHelpers'
/*  
This file should only have basic user flows for auth. Form and implementation details are tested at the component level.
*/

describe('Auth', () => {
    describe('Cognito Login', () => {
        const userLogin = async (screen: Screen<typeof queries>) => {
            await waitFor(() => {
                userClickByRole(screen, 'button', { name: 'Show Login Form' })
            })

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
            renderWithProviders(<CognitoLogin />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 403 })],
                },
            })

            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /SignUp/i })
            ).toBeInTheDocument()
        })

        it('show login button displays login form', async () => {
            renderWithProviders(<CognitoLogin />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 403 })],
                },
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

        it('when login is successful, redirect to /', async () => {
            const loginSpy = jest
                .spyOn(CognitoAuthApi, 'signIn')
                .mockResolvedValue(
                    new CognitoUser({
                        Username: 'foo@example.com',
                        Pool: { getClientId: () => '7' } as CognitoUserPool,
                    })
                )
            const history = createMemoryHistory()

            renderWithProviders(<CognitoLogin />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 403 }),
                        fetchCurrentUserMock({ statusCode: 403 }),
                    ],
                },
                routerProvider: { routerProps: { history: history } },
            })

            await userLogin(screen)

            await waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
            await waitFor(() => expect(history.location.pathname).toBe('/'))
        })

        it('when login fails, stay on page and display error alert', async () => {
            const loginSpy = jest.spyOn(CognitoAuthApi, 'signIn')
            const history = createMemoryHistory()

            renderWithProviders(<CognitoLogin />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 403 }),
                        fetchCurrentUserMock({ statusCode: 403 }),
                        fetchCurrentUserMock({ statusCode: 403 }),
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

        it('displays ang and toph and zuko when logged out', () => {
            renderWithProviders(<LocalLogin />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 403 })],
                },
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
                screen.getByRole('img', {
                    name: /Zuko/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getAllByRole('button', {
                    name: /Login/i,
                }).length
            ).toBe(3)
        })

        it('when login is successful, redirect to dashboard', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<LocalLogin />, {
                routerProvider: { routerProps: { history: history } },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 403 }),
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchCurrentUserMock({ statusCode: 200 }),
                    ],
                },
            })

            const tophButton = screen.getByTestId('TophButton')

            await waitFor(() => {
                expect(tophButton).toBeEnabled()
            })

            userClickByTestId(screen, 'TophButton')

            await waitFor(() => {
                expect(history.location.pathname).toBe('/')
            })
        })

        it('when login fails, stay on page and display error alert', async () => {
            const history = createMemoryHistory()

            renderWithProviders(<LocalLogin />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 403 }),
                        fetchCurrentUserMock({ statusCode: 403 }),
                    ],
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
