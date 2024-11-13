import React from 'react'
import userEvent from '@testing-library/user-event'
import { Route, Location, Routes } from 'react-router-dom'
import { screen, waitFor, Screen, queries } from '@testing-library/react'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'

import * as CognitoAuthApi from '../Auth/cognitoAuth'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { Login } from './Login'
import {
    renderWithProviders,
    userClickByRole,
} from '../../testHelpers/jestHelpers'

const failedAuthMock = {
    request: { query: FetchCurrentUserDocument },
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

const successfulAuthMock = {
    request: { query: FetchCurrentUserDocument },
    result: {
        data: {
            fetchCurrentUser: {
                state: 'MN',
                role: 'State User',
                email: 'bob@dmas.mn.gov',
            },
        },
    },
}

describe('Cognito Login', () => {
    const userLogin = async (screen: Screen<typeof queries>) => {
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

    it('displays login form', () => {
        renderWithProviders(<Login />)

        expect(
            screen.getByRole('form', { name: 'Login Form' })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', { name: /Login/i })
        ).toBeInTheDocument()
        expect(screen.getByTestId('loginEmail')).toBeInTheDocument()
        expect(screen.getByTestId('loginPassword')).toBeInTheDocument()
    })

    it('when login form is empty, button is disabled', () => {
        renderWithProviders(<Login />)
        expect(screen.getByRole('button', { name: /Login/i })).toBeDisabled()
    })

    it('when login form has all required fields present, login button is enabled', async () => {
        renderWithProviders(<Login />, {
            apolloProvider: { mocks: [failedAuthMock] },
        })
        const loginButton = screen.getByRole('button', { name: 'Login' })
        const loginEmail = screen.getByTestId('loginEmail')
        const loginPassword = screen.getByTestId('loginPassword')

        expect(loginButton).toBeDisabled()

        await userEvent.type(loginEmail, 'countdracula@muppets.com')
        expect(loginButton).toBeDisabled()

        await userEvent.type(loginPassword, 'passwordABC')
        await waitFor(() => expect(loginButton).not.toBeDisabled())
    })

    it('when login is successful, redirect to /', async () => {
        const loginSpy = vi.spyOn(CognitoAuthApi, 'signIn').mockResolvedValue(
            new CognitoUser({
                Username: 'foo@example.com',
                Pool: { getClientId: () => '7' } as CognitoUserPool,
            })
        )

        let testLocation: Location

        renderWithProviders(
            <Routes>
                <Route path="/auth" element={<Login />} />
            </Routes>,
            {
                apolloProvider: { mocks: [failedAuthMock, successfulAuthMock] },
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
        const loginSpy = vi
            .spyOn(CognitoAuthApi, 'signIn')
            .mockResolvedValue(new Error('Error has occurred'))

        let testLocation: Location

        renderWithProviders(
            <Routes>
                <Route path="/auth" element={<Login />} />
            </Routes>,
            {
                apolloProvider: { mocks: [failedAuthMock, failedAuthMock] },
                routerProvider: {
                    route: '/auth',
                },
                location: (location) => (testLocation = location),
            }
        )

        await userLogin(screen)
        await waitFor(() => {
            expect(loginSpy).toHaveBeenCalledTimes(1)
            expect(testLocation.pathname).toBe('/auth')
        })
    })

    it('when login is a failure, button is re-enabled', async () => {
        const loginSpy = vi
            .spyOn(CognitoAuthApi, 'signIn')
            .mockResolvedValue(new Error('somethign went wrong'))

        renderWithProviders(<Login />, {
            apolloProvider: { mocks: [failedAuthMock, failedAuthMock] },
        })

        await userLogin(screen)
        await waitFor(() => {
            expect(loginSpy).toHaveBeenCalledTimes(1)
            expect(
                screen.getByRole('button', { name: /Login/i })
            ).not.toBeDisabled()
        })
    })
})
