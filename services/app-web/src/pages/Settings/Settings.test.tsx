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
    mockValidCMSUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'
import {
    AdminUser,
    BusinessOwnerUser,
    CmsApproverUser,
    CmsUser,
    HelpdeskUser,
} from '../../gen/gqlClient'
import { userEvent } from '@testing-library/user-event'
import { RoutesRecord } from '../../constants'
import {
    StateAssignmentTable,
    DivisionAssignmentTable,
    SupportEmailsTable,
    AutomatedEmailsTable,
} from './SettingsTables'
import { fetchMcReviewSettingsFailMock } from '../../testHelpers/apolloMocks/mcReviewSettingsGQLMocks'
import { indexUsersQueryFailMock } from '../../testHelpers/apolloMocks/userGQLMock'
import { fetchEmailSettingsFailMock } from '../../testHelpers/apolloMocks/emailGQLMock'
import selectEvent from 'react-select-event'

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
        <Route path={RoutesRecord.MCR_SETTINGS} element={<Settings />}>
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

const commonSettingPageTest = async () => {
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
    const tableRowsDivision = await within(tableDivision).findAllByRole('row')
    expect(tableRowsDivision).toHaveLength(2)
    // Check the table headers
    expect(
        screen.getByRole('columnheader', { name: 'Last name' })
    ).toBeInTheDocument()
    expect(
        screen.getByRole('columnheader', { name: 'First name' })
    ).toBeInTheDocument()
    expect(
        screen.getByRole('columnheader', { name: 'Email' })
    ).toBeInTheDocument()

    // Check the table cells
    expect(within(tableDivision).getByText('Hotman')).toBeInTheDocument()
    expect(within(tableDivision).getByText('Zuko')).toBeInTheDocument()
    expect(
        within(tableDivision).getByText('zuko@example.com')
    ).toBeInTheDocument()

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
    const tableRowsSupport = await within(tableSupport).findAllByRole('row')
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
}

const commonErrorTests = async () => {
    expect(await screen.findByText('System error')).toBeInTheDocument()
    expect(
        screen.queryByRole('table', {
            name: 'State assignments',
        })
    ).toBeNull()

    // Check Division assignments table
    const divisionLink = await screen.findByRole('link', {
        name: 'Division assignments',
    })
    expect(divisionLink).toBeInTheDocument()
    await userEvent.click(divisionLink)
    expect(await screen.findByText('System error')).toBeInTheDocument()
    expect(
        screen.queryByRole('table', {
            name: 'Division assignments',
        })
    ).toBeNull()

    // Check for automated emails table
    const automatedEmailsLink = await screen.findByRole('link', {
        name: 'Automated emails',
    })
    expect(automatedEmailsLink).toBeInTheDocument()
    await userEvent.click(automatedEmailsLink)
    expect(await screen.findByText('System error')).toBeInTheDocument()
    expect(
        screen.queryByRole('table', {
            name: 'Automated emails',
        })
    ).toBeNull()

    // Check support table
    const supportEmailsLink = await screen.findByRole('link', {
        name: 'Support emails',
    })
    expect(supportEmailsLink).toBeInTheDocument()
    await userEvent.click(supportEmailsLink)
    expect(await screen.findByText('System error')).toBeInTheDocument()
    expect(
        screen.queryByRole('table', {
            name: 'Support emails',
        })
    ).toBeNull()
}

afterEach(() => {
    vi.clearAllMocks()
})

describe.each(combinedAuthorizedUsers)(
    'Settings tests for $userRole with read-write-state-assignments on',
    ({ userRole, mockUser }) => {
        it('renders settings pages', async () => {
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

            expect(await screen.findByTestId('sidenav')).toBeInTheDocument()

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
                    name: 'Assigned DMCO staff',
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
                    /cmsUser1 cmsUser1, cmsApproverUser1 cmsApproverUser1/
                )
            ).toBeInTheDocument()
            expect(
                within(tableAnalysts).getByText(
                    /cmsUser2 cmsUser2, cmsApproverUser2 cmsApproverUser2/
                )
            ).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('MN')).toBeInTheDocument()
            expect(within(tableAnalysts).getByText('OH')).toBeInTheDocument()

            await commonSettingPageTest()
        })
    }
)

describe.each(combinedAuthorizedUsers)(
    'Settings tests for $userRole with read-write-state-assignments off',
    ({ userRole, mockUser }) => {
        it('renders settings pages', async () => {
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

            expect(await screen.findByTestId('sidenav')).toBeInTheDocument()

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
                    name: 'Assigned DMCO staff',
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

            await commonSettingPageTest()
        })
    }
)

describe('Settings page filters tests', () => {
    it('filters analysts based on state and analyst', async () => {
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
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

        expect(await screen.findByTestId('sidenav')).toBeInTheDocument()

        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )

        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        const analystFilterCombobox = screen.getByRole('combobox', {
            name: 'analysts filter selection',
        })
        const stateFilterCombobox = screen.getByRole('combobox', {
            name: 'state filter selection',
        })

        expect(stateFilterCombobox).toBeInTheDocument()
        expect(analystFilterCombobox).toBeInTheDocument()

        // Add Analyst filter
        selectEvent.openMenu(analystFilterCombobox)
        const analystComboboxOptions = screen.getByTestId(
            'analysts-filter-options'
        )
        expect(analystComboboxOptions).toBeInTheDocument()
        await waitFor(async () => {
            //Expected options are present
            expect(
                within(analystComboboxOptions).getByText('cmsUser1 cmsUser1')
            ).toBeInTheDocument()
            expect(
                within(analystComboboxOptions).getByText(
                    'cmsApproverUser1 cmsApproverUser1'
                )
            ).toBeInTheDocument()
            expect(
                within(analystComboboxOptions).getByText('cmsUser2 cmsUser2')
            ).toBeInTheDocument()
            expect(
                within(analystComboboxOptions).getByText(
                    'cmsApproverUser2 cmsApproverUser2'
                )
            ).toBeInTheDocument()
            await selectEvent.select(
                analystComboboxOptions,
                'cmsUser1 cmsUser1'
            )
        })

        //Expect only MN and cmsUser1 to show on table
        const rowsFilteredOnce = await screen.findAllByRole('row')
        expect(rowsFilteredOnce).toHaveLength(2)
        expect(rowsFilteredOnce[1]).toHaveTextContent('cmsUser1 cmsUser1') // row[0] is the header
        expect(rowsFilteredOnce[1]).toHaveTextContent('MN')
        expect(screen.getByText('Displaying 1 of 2 state')).toBeInTheDocument()

        selectEvent.openMenu(analystFilterCombobox)

        const analystComboboxOptionsAgain = screen.getByTestId(
            'analysts-filter-options'
        )

        // Select analyst from OH to display 2 rows, sets up State filter test
        await waitFor(async () => {
            //Expected options are present
            expect(
                within(analystComboboxOptionsAgain).getByText(
                    'cmsUser2 cmsUser2'
                )
            ).toBeInTheDocument()
            await selectEvent.select(
                analystComboboxOptionsAgain,
                'cmsUser2 cmsUser2'
            )
        })

        const rowsFilteredTwice = await screen.findAllByRole('row')
        expect(rowsFilteredTwice).toHaveLength(3)
        expect(rowsFilteredTwice[1]).toHaveTextContent('cmsUser1 cmsUser1') // row[0] is the header
        expect(rowsFilteredTwice[1]).toHaveTextContent('MN')
        expect(rowsFilteredTwice[2]).toHaveTextContent('cmsUser2 cmsUser2') // row[0] is the header
        expect(rowsFilteredTwice[2]).toHaveTextContent('OH')
        expect(screen.getByText('Displaying 2 of 2 states')).toBeInTheDocument()

        // Add State Filter
        selectEvent.openMenu(stateFilterCombobox)

        const stateComboboxOptions = screen.getByTestId('state-filter-options')
        expect(stateComboboxOptions).toBeInTheDocument()

        await waitFor(async () => {
            //Expected options are present
            expect(
                within(stateComboboxOptions).getByText('MN')
            ).toBeInTheDocument()
            expect(
                within(stateComboboxOptions).getByText('OH')
            ).toBeInTheDocument()

            //Select option Ohio
            await selectEvent.select(stateComboboxOptions, 'OH')
        })

        //Expect only Ohio to show on table
        const rowsFilteredThrice = await screen.findAllByRole('row')
        expect(rowsFilteredThrice).toHaveLength(2)
        expect(rowsFilteredThrice[1]).toHaveTextContent('OH') // row[0] is the header
        expect(screen.getByText('Displaying 1 of 2 state')).toBeInTheDocument()

        const clearFiltersButton = screen.getByRole('button', {
            name: /Clear filters/,
        })
        expect(clearFiltersButton).toBeInTheDocument()

        await userEvent.click(clearFiltersButton)
        await waitFor(() => {
            expect(screen.getAllByRole('row')).toHaveLength(3)
        })
    })
})

describe('Settings page error tests', () => {
    it('renders error message on all settings pages read-write-state-assignments on', async () => {
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryFailMock(),
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsFailMock(),
                ],
            },
            routerProvider: {
                route: '/mc-review-settings',
            },
            featureFlags: {
                'read-write-state-assignments': true,
            },
        })

        expect(await screen.findByTestId('sidenav')).toBeInTheDocument()
        await commonErrorTests()
    })
    it('renders error message on all settings pages with read-write-state-assignments off', async () => {
        renderWithProviders(<CommonSettingsRoute />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryFailMock(),
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchEmailSettingsFailMock(),
                ],
            },
            routerProvider: {
                route: '/mc-review-settings',
            },
            featureFlags: {
                'read-write-state-assignments': false,
            },
        })

        expect(await screen.findByTestId('sidenav')).toBeInTheDocument()
        await commonErrorTests()
    })
})

describe('Admin only settings page tests', () => {
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
