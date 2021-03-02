import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor, Screen, queries } from '@testing-library/react'

import * as CognitoAuthApi from '../Auth/cognitoAuth'
import { Login } from './Login'
import { renderWithProviders, userClickByRole } from '../../utils/jestUtils'

describe('Cognito Login', () => {
    const userLogin = (screen: Screen<typeof queries>) => {
        const loginEmail = screen.getByTestId('loginEmail')
        const loginPassword = screen.getByTestId('loginPassword')

        userEvent.type(loginEmail, 'countdracula@muppets.com')
        userEvent.type(loginPassword, 'passwordABC')
        userClickByRole(screen, 'button', { name: 'Login' })
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

    it('when login form has all required fields present, login button is enabled', () => {
        renderWithProviders(<Login />)
        const loginButton = screen.getByRole('button', { name: 'Login' })
        const loginEmail = screen.getByTestId('loginEmail')
        const loginPassword = screen.getByTestId('loginPassword')

        expect(loginButton).toBeDisabled()

        userEvent.type(loginEmail, 'countdracula@muppets.com')
        expect(loginButton).toBeDisabled()

        userEvent.type(loginPassword, 'passwordABC')
        waitFor(() => expect(loginButton).not.toBeDisabled())
    })

    it('when login is clicked, button is disabled while loading', () => {
        renderWithProviders(<Login />)
        const loginButton = screen.getByRole('button', { name: 'Login' })
        const loginEmail = screen.getByTestId('loginEmail')
        const loginPassword = screen.getByTestId('loginPassword')

        userEvent.type(loginEmail, 'countdracula@muppets.com')
        userEvent.type(loginPassword, 'passwordABC')

        waitFor(() => expect(loginButton).not.toBeDisabled())

        userClickByRole(screen, 'button', { name: 'Login' })

        waitFor(() => expect(loginButton).not.toBeDisabled())
    })

    it('when login is successful, redirect to dashboard', async () => {
        const loginSpy = jest
            .spyOn(CognitoAuthApi, 'signOut')
            .mockResolvedValue(null)

        const history = createMemoryHistory()

        renderWithProviders(<Login />, {
            routerProvider: { routerProps: { history: history } },
        })

        userLogin(screen)
        waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1))
        waitFor(() => expect(history.location.pathname).toBe('/dashboard'))
    })

    it('when login fails, stay on page and display error alert', () => {
        const loginSpy = jest
            .spyOn(CognitoAuthApi, 'signOut')
            .mockRejectedValue('Error has occurred')

        const history = createMemoryHistory()

        renderWithProviders(<Login />, {
            routerProvider: { routerProps: { history: history } },
        })

        userLogin(screen)
        waitFor(() => {
            expect(loginSpy).toHaveBeenCalledTimes(1)
            expect(history.location.pathname).toBe('/auth')
        })
    })

    it('when login is a failure, button is re-enabled', () => {
        const loginSpy = jest
            .spyOn(CognitoAuthApi, 'signOut')
            .mockRejectedValue(null)

        renderWithProviders(<Login />)

        userLogin(screen)
        waitFor(() => {
            expect(loginSpy).toHaveBeenCalledTimes(1)
            expect(
                screen.getByRole('button', { name: /Login/i })
            ).not.toBeDisabled()
        })
    })
})
