import React from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import { Routes, Route, Navigate } from 'react-router'
import { Settings } from './Settings'
import {
    fetchCurrentUserMock,
    indexUsersQueryMock,
    fetchEmailSettings,
    iterableAdminUsersMockData,
    iterableCmsUsersMockData,
    fetchMcReviewSettingsMock,
    mockValidAdminUser,
    updateDivisionMockSuccess,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'
import {
    AdminUser,
    BusinessOwnerUser,
    CmsApproverUser,
    CmsUser,
    HelpdeskUser,
    IndexUsersDocument,
    IndexUsersQuery,
} from '../../gen/gqlClient'
import userEvent from '@testing-library/user-event'
import { RoutesRecord } from '../../constants'
import {
    StateAssignmentTable,
    DivisionAssignmentTable,
    SupportEmailsTable,
    AutomatedEmailsTable,
} from './SettingsTables'
import { MockedResponse } from '@apollo/client/testing'

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

const CommonSettingsRoute = () => (
    <Routes>
        <Route path={RoutesRecord.MC_REVIEW_SETTINGS} element={<Settings />}>
            <Route
                index
                element={<Navigate to={RoutesRecord.STATE_ASSIGNMENTS} />}
            />
            <Route
                path={RoutesRecord.STATE_ASSIGNMENTS}
                element={<StateAssignmentTable />}
            />
            <Route
                path={RoutesRecord.DIVISION_ASSIGNMENTS}
                element={<DivisionAssignmentTable />}
            />
            <Route
                path={RoutesRecord.AUTOMATED_EMAILS}
                element={<AutomatedEmailsTable />}
            />
            <Route
                path={RoutesRecord.SUPPORT_EMAILS}
                element={<SupportEmailsTable />}
            />
        </Route>
    </Routes>
)

describe.each(combinedAuthorizedUsers)(
    'Settings tests for $userRole with read-write-state-assignments on',
    ({ userRole, mockUser }) => {
        it('renders state assignments setting page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': true,
                },
            })

            // Check State assignments table
            const tableAnalysts = await screen.findByRole('table', {
                name: 'State assignments',
            })
            expect(tableAnalysts).toBeInTheDocument()
            const tableRowsAnalysts =
                await within(tableAnalysts).findAllByRole('row')
            expect(tableRowsAnalysts).toHaveLength(3)
            // Check the table headers
            expect(
                within(tableAnalysts).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAnalysts).getByRole('columnheader', {
                    name: 'State',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableAnalysts).getByText(
                    /testMN@example.com, cmsApproverUser1@dmas.mn.gov/
                )
            ).toBeInTheDocument()
            expect(
                within(tableAnalysts).getByText(
                    /cmsUser2@dmas.mn.gov, cmsApproverUser2@dmas.mn.go/
                )
            ).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('MN')).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('OH')).toBeInTheDocument()
        })
        it('renders the division assignments page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': true,
                },
            })

            // Check Division assignments table
            const divisionLink = await screen.findByRole('link', {
                name: 'Division assignments',
            })
            expect(divisionLink).toBeInTheDocument()
            await userEvent.click(divisionLink)

            const tableDivision = await screen.findByRole('table', {
                name: 'Division assignments',
            })
            expect(tableDivision).toBeInTheDocument()
            const tableRowsDivision =
                await within(tableDivision).findAllByRole('row')
            expect(tableRowsDivision).toHaveLength(2)
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
            expect(
                within(tableDivision).getByText('Hotman')
            ).toBeInTheDocument()
            expect(within(tableDivision).getByText('Zuko')).toBeInTheDocument()
            expect(
                within(tableDivision).getByText('zuko@example.com')
            ).toBeInTheDocument()
        })
        it('renders automated emails page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': true,
                },
            })

            // Check for automated emails table
            const automatedEmailsLink = await screen.findByRole('link', {
                name: 'Automated emails',
            })
            expect(automatedEmailsLink).toBeInTheDocument()
            await userEvent.click(automatedEmailsLink)

            const tableAutomated = await screen.findByRole('table', {
                name: 'Automated emails',
            })
            expect(tableAutomated).toBeInTheDocument()

            const tableRows = await within(tableAutomated).findAllByRole('row')
            expect(tableRows).toHaveLength(6)
            // Check the table headers
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Type',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Description',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableAutomated).getByText('testRate@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByText('testPolicy@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByText('testDmco@example.com')
            ).toBeInTheDocument()
        })
        it('should render the email settings tables', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': true,
                },
            })

            // Check support table
            const supportEmailsLink = await screen.findByRole('link', {
                name: 'Support emails',
            })
            expect(supportEmailsLink).toBeInTheDocument()
            await userEvent.click(supportEmailsLink)

            const tableSupport = await screen.findByRole('table', {
                name: 'Support emails',
            })
            expect(tableSupport).toBeInTheDocument()
            const tableRowsSupport =
                await within(tableSupport).findAllByRole('row')
            expect(tableRowsSupport).toHaveLength(4)
            // Check the table headers
            expect(
                within(tableSupport).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByRole('columnheader', { name: 'Type' })
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByRole('columnheader', {
                    name: 'Description',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableSupport).getByText('helpdesk@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByText('rates@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByText('mcog@example.com')
            ).toBeInTheDocument()
        })
    }
)

describe.each(iterableAdminUsersMockData)(
    'Settings tests for $userRole with read-write-state-assignments off',
    ({ userRole, mockUser }) => {
        it('renders state assignments setting page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': false,
                },
            })

            // Check State assignments table
            const tableAnalysts = await screen.findByRole('table', {
                name: 'State assignments',
            })
            expect(tableAnalysts).toBeInTheDocument()
            const tableRowsAnalysts =
                await within(tableAnalysts).findAllByRole('row')
            expect(tableRowsAnalysts).toHaveLength(3)
            // Check the table headers
            expect(
                within(tableAnalysts).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAnalysts).getByRole('columnheader', {
                    name: 'State',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableAnalysts).getByText(
                    /testMN@example.com, cmsApproverUser1@dmas.mn.gov/
                )
            ).toBeInTheDocument()
            expect(
                within(tableAnalysts).getByText(
                    /cmsUser2@dmas.mn.gov, cmsApproverUser2@dmas.mn.go/
                )
            ).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('MN')).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('OH')).toBeInTheDocument()
        })
        it('renders the division assignments page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': false,
                },
            })

            // Check Division assignments table
            const divisionLink = await screen.findByRole('link', {
                name: 'Division assignments',
            })
            expect(divisionLink).toBeInTheDocument()
            await userEvent.click(divisionLink)

            const tableDivision = await screen.findByRole('table', {
                name: 'Division assignments',
            })
            expect(tableDivision).toBeInTheDocument()
            const tableRowsDivision =
                await within(tableDivision).findAllByRole('row')
            expect(tableRowsDivision).toHaveLength(2)
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
            expect(
                within(tableDivision).getByText('Hotman')
            ).toBeInTheDocument()
            expect(within(tableDivision).getByText('Zuko')).toBeInTheDocument()
            expect(
                within(tableDivision).getByText('zuko@example.com')
            ).toBeInTheDocument()
        })
        it('renders automated emails page', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': false,
                },
            })

            // Check for automated emails table
            const automatedEmailsLink = await screen.findByRole('link', {
                name: 'Automated emails',
            })
            expect(automatedEmailsLink).toBeInTheDocument()
            await userEvent.click(automatedEmailsLink)

            const tableAutomated = await screen.findByRole('table', {
                name: 'Automated emails',
            })
            expect(tableAutomated).toBeInTheDocument()

            const tableRows = await within(tableAutomated).findAllByRole('row')
            expect(tableRows).toHaveLength(6)
            // Check the table headers
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Type',
                })
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByRole('columnheader', {
                    name: 'Description',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableAutomated).getByText('testRate@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByText('testPolicy@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableAutomated).getByText('testDmco@example.com')
            ).toBeInTheDocument()
        })
        it('should render the email settings tables', async () => {
            renderWithProviders(<CommonSettingsRoute />, {
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
                routerProvider: {
                    route: '/mc-review-settings',
                },
                featureFlags: {
                    'read-write-state-assignments': false,
                },
            })

            // Check support table
            const supportEmailsLink = await screen.findByRole('link', {
                name: 'Support emails',
            })
            expect(supportEmailsLink).toBeInTheDocument()
            await userEvent.click(supportEmailsLink)

            const tableSupport = await screen.findByRole('table', {
                name: 'Support emails',
            })
            expect(tableSupport).toBeInTheDocument()
            const tableRowsSupport =
                await within(tableSupport).findAllByRole('row')
            expect(tableRowsSupport).toHaveLength(4)
            // Check the table headers
            expect(
                within(tableSupport).getByRole('columnheader', {
                    name: 'Inbox',
                })
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByRole('columnheader', { name: 'Type' })
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByRole('columnheader', {
                    name: 'Description',
                })
            ).toBeInTheDocument()

            // Check the table cells
            expect(
                within(tableSupport).getByText('helpdesk@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByText('rates@example.com')
            ).toBeInTheDocument()
            expect(
                within(tableSupport).getByText('mcog@example.com')
            ).toBeInTheDocument()
        })
    }
)

describe('Admin only settings page tests', () => {
    it('shows error if failed request', async () => {
        const failedRequest = (): MockedResponse<IndexUsersQuery> => {
            return {
                request: { query: IndexUsersDocument },
                error: new Error('A network error occurred'),
            }
        }
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    failedRequest(),
                ],
            },
            routerProvider: {
                route: '/mc-review-settings',
            },
            featureFlags: {
                'read-write-state-assignments': false,
            },
        })
        await screen.findByRole('heading', { name: 'System error' })
        await screen.findByText(/Please refresh your browser/)

        const table = screen.queryByRole('table', {
            name: 'CMS Users',
        })
        expect(table).toBeNull()
    })
    it('renders division assignment combobox for admin user', async () => {
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    updateDivisionMockSuccess({
                        cmsUserID: '1',
                        divisionAssignment: 'OACT',
                    }),
                ],
            },
            routerProvider: {
                route: '/mc-review-settings',
            },
            featureFlags: {
                'read-write-state-assignments': true,
            },
        })

        // Check Division assignments table
        const divisionLink = await screen.findByRole('link', {
            name: 'Division assignments',
        })
        expect(divisionLink).toBeInTheDocument()
        await userEvent.click(divisionLink)

        // Find the table by its caption
        const table = await screen.findByRole('table', {
            name: 'Division assignments',
        })
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
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    updateDivisionMockSuccess({
                        cmsUserID: '1',
                        divisionAssignment: 'OACT',
                    }),
                ],
            },
            routerProvider: {
                route: '/mc-review-settings',
            },
            featureFlags: {
                'read-write-state-assignments': true,
            },
        })

        // Check Division assignments table
        const divisionLink = await screen.findByRole('link', {
            name: 'Division assignments',
        })
        expect(divisionLink).toBeInTheDocument()
        await userEvent.click(divisionLink)

        // Find the table by its caption
        const table = await screen.findByRole('table', {
            name: 'Division assignments',
        })
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
