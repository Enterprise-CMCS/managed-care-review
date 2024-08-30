import React from 'react'
import { screen, within } from '@testing-library/react'
import { EmailSettingsTable } from './EmailSettingsTables'
import { renderWithProviders } from '../../../testHelpers'
import {
    FetchEmailSettingsDocument,
    FetchEmailSettingsQuery,
} from '../../../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import {
    fetchEmailSettings,
    fetchCurrentUserMock,
    mockValidAdminUser,
} from '@mc-review/mocks'

describe('EmailSettings', () => {
    it('should render error message for failed request', async () => {
        const failedRequest = (): MockedResponse<FetchEmailSettingsQuery> => {
            return {
                request: { query: FetchEmailSettingsDocument },
                error: new Error('A network error occurred'),
            }
        }

        renderWithProviders(<EmailSettingsTable type="GENERAL" />, {
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
            name: 'Automated emails',
        })
        expect(table).toBeNull()
    })

    it('should render the automated emails table when expected', async () => {
        renderWithProviders(<EmailSettingsTable type="GENERAL" />, {
            apolloProvider: {
                mocks: [
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
        expect(tableRows).toHaveLength(6)

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

    it('should render the state analysts table when expected', async () => {
        renderWithProviders(<EmailSettingsTable type="ANALYSTS" />, {
            apolloProvider: {
                mocks: [
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

    it('should render the support emails table when expected', async () => {
        renderWithProviders(<EmailSettingsTable type="SUPPORT" />, {
            apolloProvider: {
                mocks: [
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
            within(table).getByText('helpdesk@example.com')
        ).toBeInTheDocument()
        expect(within(table).getByText('rates@example.com')).toBeInTheDocument()
        expect(within(table).getByText('mcog@example.com')).toBeInTheDocument()
    })
})
