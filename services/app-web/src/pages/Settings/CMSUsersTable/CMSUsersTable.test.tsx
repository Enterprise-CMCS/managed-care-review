import { screen, within } from '@testing-library/react'
import { AdminUser } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers'
import { fetchCurrentUserMock } from '../../../testHelpers/apolloMocks'
import { fetchEmailSettings } from '../../../testHelpers/apolloMocks/emailGQLMock'
import { indexUsersQueryMock } from '../../../testHelpers/apolloMocks/indexUserQueryMock'
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
})
