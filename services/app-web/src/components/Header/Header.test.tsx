import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import * as CognitoAuthApi from '../../pages/Auth/cognitoAuth'
import { renderWithProviders } from '../../utils/jestUtils'
import { Header } from './Header'
import { UserType } from '../../common-code/domain-models'
import { HELLO_WORLD } from '../../api'

describe('Header', () => {
    it('renders without errors', async () => {
        renderWithProviders(<Header />, {})

        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    describe('when logged out', () => {
        it('displays Medicaid logo image link that redirects to /dashboard', async () => {
            renderWithProviders(<Header />, {})
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('displays Medicaid and CHIP Managed Care Reporting heading', () => {
            renderWithProviders(<Header />, {})

            expect(screen.getByRole('heading')).toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
        })

        it('displays signin link when logged out', () => {
            renderWithProviders(<Header />, {})
            const signInButton = screen.getByRole('link', { name: /Sign In/i })
            expect(signInButton).toBeVisible()
            expect(signInButton).toHaveAttribute('href', '/auth')
        })

        it('redirects when signin Link is clicked', () => {
            renderWithProviders(<Header />, {})
            const signInButton = screen.getByRole('link', { name: /Sign In/i })
            userEvent.click(signInButton)
            expect(signInButton).toHaveAttribute('href', '/auth')
        })
    })

    describe('when logged in', () => {
        const loggedInAuthProps = {
            localLogin: false,
            initialize: {
                user: {
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                } as UserType,
            },
        }

        it('displays Medicaid logo image link that redirects to /dashboard', async () => {
            renderWithProviders(<Header />, { authProvider: loggedInAuthProps })
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('displays heading with users state', () => {
            // TODO: make a loop that goes through all states and checks icons/headings
            renderWithProviders(<Header stateCode="MN" />, {
                authProvider: loggedInAuthProps,
            })
            expect(screen.getByRole('heading')).toHaveTextContent('Minnesota')
        })

        it('displays heading with the current page', () => {
            renderWithProviders(
                <Header stateCode="MN" activePage={'Dashboard'} />,
                {
                    authProvider: loggedInAuthProps,
                }
            )
            expect(screen.getByRole('heading')).toHaveTextContent('Dashboard')
        })

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

        it('calls logout api when Sign Out button is clicked', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

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

        it('calls setAlert when logout is unsuccessful', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockRejectedValue('This logout failed!')
            const mockAlert = jest.fn()
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
                    setAlert={mockAlert}
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
            expect(mockAlert).toHaveBeenCalled()
        })

        it('shows signin link when logout is successful', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

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
            expect(screen.getByRole('link', { name: /Sign In/i })).toBeVisible()
        })
    })
})
