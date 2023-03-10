import React from 'react'
import { screen, within } from '@testing-library/react'
import { Settings } from './Settings'
import { indexUsersQueryMock } from '../../testHelpers/apolloMocks/indexUserQueryMock'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'

describe('Settings', () => {
    it('should render the table with the correct columns and data', async () => {
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
        // Find the table by its caption
        const table = await screen.findByRole('table', { name: 'CMS Users' })
        expect(table).toBeInTheDocument()

        // Count the table rows
        const tableRows = await screen.findAllByRole('row')
        expect(tableRows).toHaveLength(2)

        // Check the table headers
        expect(
            screen.getByRole('columnheader', { name: 'Family Name' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('columnheader', { name: 'Given Name' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('columnheader', { name: 'Email' })
        ).toBeInTheDocument()

        // Check the table cells
        expect(within(table).getByText('Hotman')).toBeInTheDocument()
        expect(within(table).getByText('Zuko')).toBeInTheDocument()
        expect(within(table).getByText('zuko@example.com')).toBeInTheDocument()
    })
})
