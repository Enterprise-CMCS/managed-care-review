import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor } from '@testing-library/react'

import { Dashboard } from './Dashboard'
import { fetchCurrentUserMock } from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('Dashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getAllByRole('heading', {
                    level: 2,
                    name: 'Submissions',
                })
            ).toBeDefined()
        )
    })

    it('displays new submission link', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            expect(links[0]).toHaveAttribute('href', '/submissions/new')
        })
    })

    it('displays tabs for available programs based on loggedInUser state', async () => {
        const mockUser = {
            role: 'State User',
            name: 'Bob in Virginia',
            email: 'bob@dmas.va.gov',
            state: {
                name: 'Virginia',
                code: 'VA',
                programs: [
                    { id: 'first', name: 'Program 1' },
                    { id: 'second', name: 'Program 2' },
                    { id: 'third', name: 'Program 3' },
                ],
            },
        }

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                ],
            },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0].textContent).toBe('Program 1')
            expect(tabs[1].textContent).toBe('Program 2')
        })
    })

    it('loads first tab active', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0]).toHaveClass('easi-tabs__tab--selected')
            expect(tabs[1]).not.toHaveClass('easi-tabs__tab--selected')
            expect(tabs[2]).not.toHaveClass('easi-tabs__tab--selected')
        })
    })

    it('on new submission click, redirect to /submissions/new', async () => {
        const history = createMemoryHistory()

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
            routerProvider: {
                routerProps: { history: history },
            },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            userEvent.click(links[0])
        })

        await waitFor(() => {
            expect(history.location.pathname).toBe('/submissions/new')
        })
    })
})
