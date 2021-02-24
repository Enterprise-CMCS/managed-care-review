import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import * as AuthApi from '../../pages/Auth/cognitoAuth'
import { renderWithProviders } from '../../utils/jestUtils'
import { Header } from './Header'
import { UserType } from '../../common-code/domain-models'
import { HELLO_WORLD } from '../../api'

const loggedInAuthProps = {
    localLogin: false,
    initialize: {
        user: {
            name: 'Bob test user',
            email: 'bob@dmas.mn.gov',
        } as UserType,
    },
}

const loggedOutAuthProps = {
    localLogin: false,
}

describe('Header', () => {
    it('renders without errors', async () => {
        renderWithProviders(<Header />, { authProvider: loggedOutAuthProps })

        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    describe('when logged out', () => {
        it('has Medicaid logo image link that redirects to /dashboard', async () => {
            renderWithProviders(<Header />, {
                authProvider: loggedOutAuthProps,
            })
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('has  Medicaid and CHIP Managed Care Reporting heading', () => {
            renderWithProviders(<Header />, {
                authProvider: loggedOutAuthProps,
            })

            expect(screen.getByRole('heading')).toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
        })

        it('displays signin link when logged out', async () => {
            renderWithProviders(<Header />, {
                authProvider: loggedOutAuthProps,
            })
            expect(screen.getByRole('link', { name: /Sign In/i })).toBeVisible()
        })

        it('signin link goes to /auth', () => {
            renderWithProviders(<Header />, {
                authProvider: loggedOutAuthProps,
            })
            expect(
                screen.getByRole('link', { name: /Sign In/i })
            ).toHaveAttribute('href', '/auth')
        })
    })

    describe('when logged in', () => {
        it('has Medicaid logo image link that redirects to /dashboard', async () => {
            renderWithProviders(<Header />, { authProvider: loggedInAuthProps })
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('has heading with users state', () => {
            // TODO: make a loop
            renderWithProviders(<Header stateCode="MN" />, {
                authProvider: loggedInAuthProps,
            })
            expect(screen.getByRole('heading')).toHaveTextContent('Minnesota')
        })

        it.todo('has heading with the current program')

        it('displays sign out button', async () => {
            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                { authProvider: loggedInAuthProps }
            )
            expect(
                screen.getByRole('button', { name: /Sign out/i })
            ).toHaveTextContent('Sign out')
        })

        it('calls signOut when signout button is clicked', async () => {
            const spy = jest.spyOn(AuthApi, 'signOut').mockResolvedValue(null)

            const apolloProviderMock = {
                mocks: [
                    {
                        request: { query: HELLO_WORLD },
                        result: { data: {} },
                    },
                ],
            }

            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    authProvider: loggedInAuthProps,
                    apolloProvider: apolloProviderMock,
                }
            )
            userEvent.click(screen.getByRole('button', { name: /Sign out/i }))

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
        })

        it('shows signin link when signout button is clicked and logout is successful', async () => {
            const spy = jest.spyOn(AuthApi, 'signOut').mockResolvedValue(null)

            const apolloProviderMock = {
                mocks: [
                    {
                        request: { query: HELLO_WORLD },
                        error: new Error('Unauthorized request'),
                    },
                ],
            }

            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    authProvider: loggedInAuthProps,
                    apolloProvider: apolloProviderMock,
                }
            )
            userEvent.click(screen.getByRole('button', { name: /Sign out/i }))

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
            expect(screen.getByRole('link', { name: /Sign In/i })).toBeVisible()
        })

        // TODO - what should happen to signin/signout button if logout fails? Where should error display?
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip('displays error when signout button is clicked and logout is unsuccessful', async () => {
            const spy = jest
                .spyOn(AuthApi, 'signOut')
                .mockRejectedValue('This test should fail!')

            const apolloProviderMock = {
                mocks: [
                    {
                        request: { query: HELLO_WORLD },
                        result: { data: {} },
                    },
                ],
            }

            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    authProvider: loggedInAuthProps,
                    apolloProvider: apolloProviderMock,
                }
            )
            userEvent.click(screen.getByRole('button', { name: /Sign out/i }))

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
            expect(screen.queryByRole('link', { name: /Sign In/i })).toBeNull()
        })
    })
})
