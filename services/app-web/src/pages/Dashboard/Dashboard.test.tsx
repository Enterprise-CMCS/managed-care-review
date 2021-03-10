import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor } from '@testing-library/react'

import { Dashboard } from './Dashboard'
import { mockGetCurrentUser200 } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'

describe('Dashboard', () => {
    it('display submission heading', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
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
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            expect(links[0]).toHaveAttribute('href', '/new')
        })
    })

    it('displays tabs for available programs based on loggedInUser state', async () => {
        const mockWithPrograms = mockGetCurrentUser200
        mockWithPrograms.result.data.getCurrentUser.state.programs = [
            { name: 'Program 1' },
            { name: 'Program 2' },
            { name: 'Program 3' },
        ]
        renderWithProviders(<Dashboard />, {
            apolloProvider: { mocks: [mockWithPrograms] },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0].textContent).toBe('Program 1')
            expect(tabs[1].textContent).toBe('Program 2')
        })
    })

    it('loading with first tab active', async () => {
        renderWithProviders(<Dashboard />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() => {
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(3)
            expect(tabs[0]).toHaveClass('easi-tabs__tab--selected')
            expect(tabs[1]).not.toHaveClass('easi-tabs__tab--selected')
            expect(tabs[2]).not.toHaveClass('easi-tabs__tab--selected')
        })
    })

    it('on new submission click, redirect to /new', async () => {
        const history = createMemoryHistory()

        renderWithProviders(<Dashboard />, {
            apolloProvider: {
                mocks: [mockGetCurrentUser200, mockGetCurrentUser200],
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
            expect(history.location.pathname).toBe('/new')
        })
    })
})
