import React from 'react'
import { screen, within } from '@testing-library/react'
import { CMSUsersTable } from './CMSUsersTable'
import {
    fetchCurrentUserMock,
    indexUsersQueryMock,
    mockValidAdminUser,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers'
import { MockedResponse } from '@apollo/client/testing'
import { IndexUsersDocument, IndexUsersQuery } from '../../../gen/gqlClient'

describe('CMSUsersTable', () => {
    it('shows error if failed request', async () => {
        const failedRequest = (): MockedResponse<IndexUsersQuery> => {
            return {
                request: { query: IndexUsersDocument },
                error: new Error('A network error occurred'),
            }
        }
        renderWithProviders(<CMSUsersTable />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    failedRequest(),
                ],
            },
        })
        await screen.findByRole('heading', { name: 'System error' })
        await screen.findByText(/Please refresh your browser/)

        const table = await screen.queryByRole('table', {
            name: 'CMS Users',
        })
        expect(table).toBeNull()
    })

    it('should render the CMS users table with the correct columns and data', async () => {
        renderWithProviders(<CMSUsersTable />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                ],
            },
        })
        // Find the table by its caption
        const table = await screen.findByRole('table', { name: 'CMS Users' })
        expect(table).toBeInTheDocument()

        // Count the table rows
        const tableRows = await within(table).findAllByRole('row')
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
