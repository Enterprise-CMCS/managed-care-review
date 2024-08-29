import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUser } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers'
import {
    fetchCurrentUserMock,
    updateDivisionMockSuccess,
    updateDivisionMockError,
    indexUsersQueryMock,
} from '../../../testHelpers/apolloMocks'
import { CMSUsersTable } from './CMSUsersTable'

describe('CMSUsersTable', () => {
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

    it('should update the dropdown after an edit', async () => {
        renderWithProviders(<CMSUsersTable />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    updateDivisionMockSuccess({
                        cmsUserID: '1',
                        divisionAssignment: 'OACT',
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

        const zukRow = within(table).getByText('Hotman').parentElement
        if (!zukRow) {
            throw new Error('no zuko row in the table')
        }

        const divisionChooser = within(zukRow).getByRole('combobox')
        expect(divisionChooser).toBeInTheDocument()

        await userEvent.click(divisionChooser)

        await waitFor(() => {
            expect(within(zukRow).getByText('OACT')).toBeInTheDocument()
        })

        const oact = within(zukRow).getByText('OACT')

        await userEvent.click(oact)

        expect(within(zukRow).getByText('OACT')).toBeInTheDocument()
    })

    it('should display an error if updateUser fails', async () => {
        renderWithProviders(<CMSUsersTable />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    updateDivisionMockError({
                        cmsUserID: '1',
                        divisionAssignment: 'OACT',
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

        const zukRow = within(table).getByText('Hotman').parentElement
        if (!zukRow) {
            throw new Error('no zuko row in the table')
        }

        const divisionChooser = within(zukRow).getByRole('combobox')
        expect(divisionChooser).toBeInTheDocument()

        await userEvent.click(divisionChooser)

        await waitFor(() => {
            expect(within(zukRow).getByText('OACT')).toBeInTheDocument()
        })

        const oact = within(zukRow).getByText('OACT')

        await userEvent.click(oact)

        // OK this is heinous. There's probably a better way to use styles for this error
        // but I went with the first recommendation on react-select which was setting
        // styles directly. This while loop finds the particular "control" div that gets
        // the red border on error.
        let parent = divisionChooser.parentElement
        while (parent && !parent.className.endsWith('-control')) {
            parent = parent.parentElement
        }

        await waitFor(() => {
            expect(parent).toHaveStyle('border-color: hsl(0, 0%, 70%);')
        })
    })
})
