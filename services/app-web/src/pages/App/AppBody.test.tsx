import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../utils/jestUtils'
import { AppBody } from './AppBody'
import { UserType } from '../../common-code/domain-models'
import { HELLO_WORLD } from '../../api'

test('renders without errors', () => {
    renderWithProviders(<AppBody />, {
        authProvider: { localLogin: false },
    })
    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
})

describe('Routing', () => {
    describe('/', () => {
        it('display dashboard when logged in', async () => {
            const apolloProviderMock = {
                mocks: [
                    {
                        request: { query: HELLO_WORLD },
                        result: { data: {} },
                    },
                ],
            }
            renderWithProviders(<AppBody />, {
                apolloProvider: apolloProviderMock,
                authProvider: {
                    localLogin: false,
                    initialize: {
                        user: {
                            name: 'Bob it user',
                            email: 'bob@dmas.mn.gov',
                        } as UserType,
                    },
                },
            })
            expect(
                screen.queryByRole('heading', { level: 1 })
            ).toBeInTheDocument()
            await waitFor(() =>
                expect(screen.getByTestId('dashboardPage')).toBeInTheDocument()
            )
        })

        it('display landing page when logged out', () => {
            renderWithProviders(<AppBody />, {})
            expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(
                2
            )
            expect(screen.getByTestId('landingPage')).toBeInTheDocument()
        })
    })

    describe('/auth', () => {
        it.todo('when user clicks Sign In link, redirects to /auth')
        it.todo('display local login page when expected')
        it.todo('display cognito login page when expected')
    })

    describe('invalid routes', () => {
        it.todo('redirect to landing page when logged out')
        it.todo('display 404 error page when logged in')
    })
})
