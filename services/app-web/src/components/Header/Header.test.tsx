import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import * as CognitoAuthApi from '../../pages/Auth/cognitoAuth'
import { renderWithProviders } from '../../utils/jestUtils'
import { Header } from './Header'
import { HELLO_WORLD } from '../../api'

const successfulLoginMock = {
    request: { query: HELLO_WORLD },
    result: {
        data: {
            hello: {
                user: {
                    state: 'MN',
                    role: 'State User',
                    name: 'Bob it user',
                    email: 'bob@dmas.mn.gov',
                },
            },
        },
    },
}

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
        it('displays Medicaid logo image link that redirects to /dashboard', () => {
            renderWithProviders(<Header />, {
                apolloProvider: { mocks: [successfulLoginMock] },
            })
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('displays heading with users state', async () => {
            // TODO: make a loop that goes through all states and checks icons/headings
            renderWithProviders(<Header stateCode="MN" />, {
                apolloProvider: { mocks: [successfulLoginMock] },
            })
            await waitFor(() =>
                expect(screen.getByRole('heading')).toHaveTextContent(
                    'Minnesota'
                )
            )
        })

        it('displays heading with the current page', async () => {
            renderWithProviders(
                <Header stateCode="MN" activePage={'Dashboard'} />,
                {
                    apolloProvider: { mocks: [successfulLoginMock] },
                }
            )
            await waitFor(() =>
                expect(screen.getByRole('heading')).toHaveTextContent(
                    'Dashboard'
                )
            )
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
                {
                    apolloProvider: { mocks: [successfulLoginMock] },
                }
            )

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: /Sign out/i,
                })
                expect(signOutButton).toBeInTheDocument()
            })
        })

        it('calls logout api when Sign Out button is clicked', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            successfulLoginMock,
                            {
                                request: { query: HELLO_WORLD },
                                result: { data: {} },
                            },
                        ],
                    },
                }
            )

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: /Sign out/i,
                })
                expect(signOutButton).toBeInTheDocument()
                userEvent.click(signOutButton)
            })

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
        })

        it('calls setAlert when logout is unsuccessful', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockRejectedValue('This logout failed!')
            const mockAlert = jest.fn()

            renderWithProviders(
                <Header
                    setAlert={mockAlert}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            successfulLoginMock,
                            {
                                request: { query: HELLO_WORLD },
                                result: { data: {} },
                            },
                        ],
                    },
                }
            )

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: /Sign out/i,
                })

                expect(signOutButton).toBeInTheDocument()
                userEvent.click(signOutButton)
            })

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
            await waitFor(() => expect(mockAlert).toHaveBeenCalled())
        })

        it.skip('shows signin link when logout is successful', async () => {
            const spy = jest
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

            renderWithProviders(
                <Header
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />,
                {
                    apolloProvider: {
                        mocks: [successfulLoginMock],
                    },
                }
            )

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: /Sign out/i,
                })

                expect(signOutButton).toBeInTheDocument()
                userEvent.click(signOutButton)
            })

            await waitFor(() => {
                expect(spy).toHaveBeenCalledTimes(1)
                expect(
                    screen.getByRole('link', { name: /Sign In/i })
                ).toBeVisible()
            })
        })
    })
})
