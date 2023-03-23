import React from 'react'
import { screen, within } from '@testing-library/react'
import { Settings } from './Settings'
import { indexUsersQueryMock } from '../../testHelpers/apolloMocks/indexUserQueryMock'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'
import { AdminUser } from '../../gen/gqlClient'
import { fetchEmailSettings } from '../../testHelpers/apolloMocks/emailGQLMock'

describe('Settings', () => {
    function mockValidAdminUser(): AdminUser {
        return {
            __typename: 'AdminUser' as const,
            id: 'bar-id',
            role: 'ADMIN_USER',
            givenName: 'bob',
            familyName: 'ddmas',
            email: 'bob@dmas.mn.gov',
        }
    }
    it('should render the CMS users table with the correct columns and data', async () => {
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

    it('should render the automated emails table with correct data', async () => {
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
        const table = await screen.findByRole('table', {
            name: 'Automated emails',
        })
        expect(table).toBeInTheDocument()

        // Count the table rows
        const tableRows = await within(table).findAllByRole('row')
        expect(tableRows).toHaveLength(5)

        // Check the table headers
        expect(
            within(table).getByRole('columnheader', { name: 'Inbox' })
        ).toBeInTheDocument()
        expect(
            within(table).getByRole('columnheader', { name: 'Type' })
        ).toBeInTheDocument()
        expect(
            within(table).getByRole('columnheader', { name: 'Description' })
        ).toBeInTheDocument()

        // Check the table cells
        expect(
            within(table).getByText('testRate@example.com')
        ).toBeInTheDocument()
        expect(
            within(table).getByText('testPolicy@example.com')
        ).toBeInTheDocument()
        expect(
            within(table).getByText('testDmco@example.com')
        ).toBeInTheDocument()
    })

    it('should render the state analysts table with correct data', async () => {
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
        const table = await screen.findByRole('table', {
            name: 'Analyst emails',
        })
        expect(table).toBeInTheDocument()

        // Count the table rows
        const tableRows = await within(table).findAllByRole('row')
        expect(tableRows).toHaveLength(2)

        // Check the table headers
        expect(
            within(table).getByRole('columnheader', { name: 'Inbox' })
        ).toBeInTheDocument()
        expect(
            within(table).getByRole('columnheader', { name: 'State' })
        ).toBeInTheDocument()

        // Check the table cells
        expect(
            within(table).getByText('testMN@example.com')
        ).toBeInTheDocument()
        expect(within(table).getByText('MN')).toBeInTheDocument()
    })

    it('should render the support emails table with correct data', async () => {
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
        const table = await screen.findByRole('table', {
            name: 'Support emails',
        })
        expect(table).toBeInTheDocument()

        // Count the table rows
        const tableRows = await within(table).findAllByRole('row')
        expect(tableRows).toHaveLength(4)

        // Check the table headers
        expect(
            within(table).getByRole('columnheader', {
                name: 'Inbox',
            })
        ).toBeInTheDocument()
        expect(
            within(table).getByRole('columnheader', { name: 'Type' })
        ).toBeInTheDocument()
        expect(
            within(table).getByRole('columnheader', {
                name: 'Description',
            })
        ).toBeInTheDocument()

        // Check the table cells
        expect(
            within(table).getByText('mc-review@example.com')
        ).toBeInTheDocument()
        expect(within(table).getByText('rates@example.com')).toBeInTheDocument()
        expect(within(table).getByText('mcog@example.com')).toBeInTheDocument()
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
