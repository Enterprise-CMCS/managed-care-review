import { screen, waitFor } from '@testing-library/react'
import * as CognitoAuthApi from '../../pages/Auth/cognitoAuth'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import {
    fetchCurrentUserMock,
    iterableAdminUsersMockData,
    iterableCmsUsersMockData,
} from '@mc-review/mocks'
import { Header } from './Header'

describe('Header', () => {
    it('renders without errors', async () => {
        renderWithProviders(<Header authMode={'AWS_COGNITO'} />)

        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    describe('when logged out', () => {
        it('displays Medicaid logo image link that redirects to /', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />)
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /One Mac/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/')
            expect(logoLink).toContainElement(logoImage)
        })

        it('displays Medicaid and CHIP Managed Care Reporting heading', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />)

            await waitFor(() => {
                expect(screen.getByRole('heading')).toHaveTextContent(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )
            })
        })

        it('displays signin link when logged out', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />)
            await waitFor(() => {
                const signInButton = screen.getByRole('link', {
                    name: /Sign In/i,
                })
                expect(signInButton).toBeVisible()
                expect(signInButton).toHaveAttribute('href', '/auth')
            })
        })

        it('redirects when signin Link is clicked', async () => {
            const { user } = renderWithProviders(
                <Header authMode={'AWS_COGNITO'} />
            )
            await waitFor(() => {
                const signInButton = screen.getByRole('link', {
                    name: /Sign In/i,
                })
                void user.click(signInButton)
                expect(signInButton).toHaveAttribute('href', '/auth')
            })
        })
    })

    describe('when logged in', () => {
        it('displays Medicaid logo image link that redirects to /', () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /One Mac/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/')
            expect(logoLink).toContainElement(logoImage)
        })

        it('displays heading with users state', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            await waitFor(() =>
                expect(screen.getByRole('heading')).toHaveTextContent(
                    'Minnesota'
                )
            )
        })

        it('displays heading with the current page', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/submissions/new' },
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            await waitFor(() =>
                expect(screen.getByRole('heading')).toHaveTextContent(
                    /Minnesota/
                )
            )
        })

        it('displays sign out button', async () => {
            const { user } = renderWithProviders(
                <Header authMode={'AWS_COGNITO'} />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await waitFor(() => {
                const yourAccountButton = screen.getByRole('button', {
                    name: 'Your account',
                })
                expect(yourAccountButton).toBeInTheDocument()
                void user.click(yourAccountButton)
            })

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: 'Sign out',
                })
                expect(signOutButton).toBeInTheDocument()
            })
        })

        it('calls logout api when Sign Out button is clicked', async () => {
            const spy = vi
                .spyOn(CognitoAuthApi, 'signOut')
                .mockResolvedValue(null)

            const { user } = renderWithProviders(
                <Header authMode={'AWS_COGNITO'} />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchCurrentUserMock({ statusCode: 403 }),
                        ],
                    },
                }
            )

            await waitFor(() => {
                const yourAccountButton = screen.getByRole('button', {
                    name: 'Your account',
                })
                expect(yourAccountButton).toBeInTheDocument()
                void user.click(yourAccountButton)
            })

            await waitFor(() => {
                const signOutButton = screen.getByRole('button', {
                    name: 'Sign out',
                })
                expect(signOutButton).toBeInTheDocument()
                void user.click(signOutButton)
            })

            await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
        })
    })
})

const adminAndCmsUsers = [
    ...iterableAdminUsersMockData,
    ...iterableCmsUsersMockData,
]

describe.each(adminAndCmsUsers)(
    'Admin and CMS users tests',
    ({ mockUser, userRole }) => {
        it('renders MC-review settings link for $userRole', async () => {
            renderWithProviders(<Header authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            })

            await waitFor(() => {
                const yourAccountButton = screen.getByRole('button', {
                    name: 'Your account',
                })
                expect(yourAccountButton).toBeInTheDocument()
            })

            expect(
                screen.getByRole('link', { name: 'MC-Review settings' })
            ).toBeInTheDocument()
        })
    }
)
