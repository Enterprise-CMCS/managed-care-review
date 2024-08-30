import React from 'react'
import { screen, within } from '@testing-library/react'
import { Settings } from './Settings'
import {
    fetchCurrentUserMock,
    indexUsersQueryMock,
    fetchEmailSettings,
    mockValidAdminUser,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'

describe('Settings', () => {
    it('should render the CMS users table', async () => {
        renderWithProviders(<Settings />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchEmailSettings(),
                ],
            },
        })
        // Find the table by its caption
        const table = await screen.findByRole('table', { name: 'CMS Users' })
        expect(table).toBeInTheDocument()
        const tableRows = await within(table).findAllByRole('row')
        expect(tableRows).toHaveLength(2)
    })

    it('should render the email settings tables', async () => {
        renderWithProviders(<Settings />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchEmailSettings(),
                ],
            },
        })
        // Check for automated emails table
        const tableAutomated = await screen.findByRole('table', {
            name: 'Automated emails',
        })
        expect(tableAutomated).toBeInTheDocument()

        const tableRows = await within(tableAutomated).findAllByRole('row')
        expect(tableRows).toHaveLength(6)

        // Check analysts table
        const tableAnalysts = await screen.findByRole('table', {
            name: 'Analyst emails',
        })
        expect(tableAnalysts).toBeInTheDocument()
        const tableRowsAnalysts =
            await within(tableAnalysts).findAllByRole('row')
        expect(tableRowsAnalysts).toHaveLength(2)

        // Check support table
        const tableSupport = await screen.findByRole('table', {
            name: 'Support emails',
        })
        expect(tableSupport).toBeInTheDocument()
        const tableRowsSupport = await within(tableSupport).findAllByRole('row')
        expect(tableRowsSupport).toHaveLength(4)
    })

    it('should render error message for non admin user', async () => {
        renderWithProviders(<Settings />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        statusCode: 200,
                    }),
                ],
            },
        })
        const table = await screen.queryByRole('table', { name: 'CMS Users' })
        expect(table).toBeNull()

        await screen.findByRole('heading', { name: 'Admin only' })

        await screen.findByText('Currently only viewable by Admin users')
    })
})
