import React from 'react'
import { screen, within } from '@testing-library/react'
import { Settings } from './Settings'
import {
    fetchCurrentUserMock,
    indexUsersQueryMock,
    fetchEmailSettings,
    iterableAdminUsersMockData,
    iterableCmsUsersMockData,
    fetchMcReviewSettingsMock,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'
import {
    AdminUser,
    BusinessOwnerUser,
    CmsApproverUser,
    CmsUser,
    HelpdeskUser,
} from '../../gen/gqlClient'

const combinedAuthorizedUsers: {
    userRole:
        | 'CMS_USER'
        | 'CMS_APPROVER_USER'
        | 'HELPDESK_USER'
        | 'BUSINESSOWNER_USER'
        | 'ADMIN_USER'
    mockUser: <T>(
        userData?: Partial<T>
    ) =>
        | AdminUser
        | BusinessOwnerUser
        | HelpdeskUser
        | CmsUser
        | CmsApproverUser
}[] = [...iterableAdminUsersMockData, ...iterableCmsUsersMockData]

describe.each(combinedAuthorizedUsers)(
    'Settings tests for $userRole with read-write-state-assignments on',
    ({ userRole, mockUser }) => {
        it('should render the email settings tables', async () => {
            renderWithProviders(<Settings />, {
                apolloProvider: {
                    mocks: [
                        indexUsersQueryMock(),
                        fetchCurrentUserMock({
                            user: mockUser(),
                            statusCode: 200,
                        }),
                        fetchMcReviewSettingsMock(),
                    ],
                },
                featureFlags: {
                    'read-write-state-assignments': true,
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
            expect(tableRowsAnalysts).toHaveLength(3)

            // Check support table
            const tableSupport = await screen.findByRole('table', {
                name: 'Support emails',
            })
            expect(tableSupport).toBeInTheDocument()
            const tableRowsSupport =
                await within(tableSupport).findAllByRole('row')
            expect(tableRowsSupport).toHaveLength(4)
        })

        it('should render the CMS users table', async () => {
            renderWithProviders(<Settings />, {
                apolloProvider: {
                    mocks: [
                        indexUsersQueryMock(),
                        fetchCurrentUserMock({
                            user: mockUser(),
                            statusCode: 200,
                        }),
                        fetchMcReviewSettingsMock(),
                    ],
                },
                featureFlags: {
                    'read-write-state-assignments': true,
                },
            })
            // Find the table by its caption
            const table = await screen.findByRole('table', {
                name: 'CMS Users',
            })
            expect(table).toBeInTheDocument()
            const tableRows = await within(table).findAllByRole('row')
            expect(tableRows).toHaveLength(2)
        })
    }
)

describe.each(iterableAdminUsersMockData)(
    'Settings tests for $userRole with read-write-state-assignments off',
    ({ userRole, mockUser }) => {
        it('should render the email settings tables', async () => {
            renderWithProviders(<Settings />, {
                apolloProvider: {
                    mocks: [
                        indexUsersQueryMock(),
                        fetchCurrentUserMock({
                            user: mockUser(),
                            statusCode: 200,
                        }),
                        fetchEmailSettings(),
                    ],
                },
                featureFlags: {
                    'read-write-state-assignments': false,
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
            expect(tableRowsAnalysts).toHaveLength(3)

            // Check support table
            const tableSupport = await screen.findByRole('table', {
                name: 'Support emails',
            })
            expect(tableSupport).toBeInTheDocument()
            const tableRowsSupport =
                await within(tableSupport).findAllByRole('row')
            expect(tableRowsSupport).toHaveLength(4)
        })

        it('should render the CMS users table', async () => {
            renderWithProviders(<Settings />, {
                apolloProvider: {
                    mocks: [
                        indexUsersQueryMock(),
                        fetchCurrentUserMock({
                            user: mockUser(),
                            statusCode: 200,
                        }),
                        fetchEmailSettings(),
                    ],
                },
                featureFlags: {
                    'read-write-state-assignments': false,
                },
            })
            // Find the table by its caption
            const table = await screen.findByRole('table', {
                name: 'CMS Users',
            })
            expect(table).toBeInTheDocument()
            const tableRows = await within(table).findAllByRole('row')
            expect(tableRows).toHaveLength(2)
        })
    }
)

describe('Settings state user tests', () => {
    it('should render error message for state user', async () => {
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
