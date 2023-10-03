import React from 'react'
import userEvent from '@testing-library/user-event'
import { Route, Location, Routes } from 'react-router-dom'
import { screen, waitFor, Screen, queries } from '@testing-library/react'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'

import * as CognitoAuthApi from '../Auth/cognitoAuth'
import {
    renderWithProviders,
    userClickByTestId,
    userClickByRole,
} from '../../testHelpers/jestHelpers'
import { CognitoLogin } from './CognitoLogin'
import { LocalLogin } from '../../localAuth'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
/*  
This file should only have basic user flows for auth. Form and implementation details are tested at the component level.
*/

describe('Auth', () => {
    describe('Cognito Login', () => {
        const userLogin = async (screen: Screen<typeof queries>) => {
            await userClickByRole(screen, 'button', {
                name: 'Show Login Form',
            })

            const loginEmail = screen.getByTestId('loginEmail')
            const loginPassword = screen.getByTestId('loginPassword')

            await userEvent.type(loginEmail, 'countdracula@muppets.com')
            await userEvent.type(loginPassword, 'passwordABC')
            await waitFor(() =>
                expect(
                    screen.getByRole('button', { name: 'Login' })
                ).not.toBeDisabled()
            )
            await userClickByRole(screen, 'button', { name: 'Login' })
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

            await userClickByRole(screen, 'button', { name: 'Show Login Form' })

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

            let testLocation: Location

            renderWithProviders(
                <Routes>
                    <Route path="/auth" element={<CognitoLogin />} />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 403 }),
                            fetchCurrentUserMock({ statusCode: 403 }),
                        ],
                    },
                    routerProvider: {
                        route: '/auth',
                    },
                    location: (location) => (testLocation = location),
                }
            )

            await userLogin(screen)

            await waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
            await waitFor(() => expect(testLocation.pathname).toBe('/'))
        })

        it('when login fails, stay on page and display error alert', async () => {
            const loginSpy = jest
                .spyOn(CognitoAuthApi, 'signIn')
                .mockRejectedValue(new Error('Login failed'))

            let testLocation: Location

            renderWithProviders(
                <Routes>
                    <Route path="/auth" element={<CognitoLogin />} />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 403 })],
                    },
                    routerProvider: {
                        route: '/auth',
                    },
                    location: (location) => (testLocation = location),
                }
            )
            await waitFor(() => userLogin(screen))

            await waitFor(() => {
                expect(loginSpy).toHaveBeenCalledTimes(1)
                expect(testLocation.pathname).toBe('/auth')
            })
        })
    })

    describe('local login', () => {
        afterEach(() => {
            window.localStorage.clear()
        })

        it('displays aang and toph and zuko and roku and izumi and iroh when logged out', () => {
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
                screen.getByRole('img', {
                    name: /Roku/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('img', {
                    name: /Izumi/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('img', {
                    name: /Iroh/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('img', {
                    name: /Appa/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('img', {
                    name: /Shi Tong/i,
                })
            ).toBeInTheDocument()

            expect(
                screen.getAllByRole('button', {
                    name: /Login/i,
                })
            ).toHaveLength(8)
        })

        it('when login is successful, redirect to dashboard', async () => {
            let testLocation: Location

            renderWithProviders(
                <Routes>
                    <Route path="/auth" element={<LocalLogin />} />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 403 }),
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchCurrentUserMock({ statusCode: 200 }),
                        ],
                    },
                    routerProvider: {
                        route: '/auth',
                    },
                    location: (location) => (testLocation = location),
                }
            )

            const tophButton = screen.getByTestId('TophButton')

            await waitFor(() => {
                expect(tophButton).toBeEnabled()
            })

            await userClickByTestId(screen, 'TophButton')

            await waitFor(() => {
                expect(testLocation.pathname).toBe('/')
            })
        })

        it('when login fails, stay on page and display error alert', async () => {
            let testLocation: Location

            renderWithProviders(
                <Routes>
                    <Route path="/auth" element={<LocalLogin />} />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 403 }),
                            fetchCurrentUserMock({ statusCode: 403 }),
                        ],
                    },
                    routerProvider: {
                        route: '/auth',
                    },
                    location: (location) => (testLocation = location),
                }
            )

            await userClickByTestId(screen, 'TophButton')
            await waitFor(() => {
                expect(testLocation.pathname).toBe('/auth')
            })
        })
    })
})
