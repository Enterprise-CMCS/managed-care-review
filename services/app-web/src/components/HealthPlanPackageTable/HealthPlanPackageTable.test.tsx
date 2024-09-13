import { renderWithProviders } from '../../testHelpers/jestHelpers'
import {
    HealthPlanPackageTable,
    PackageInDashboardType,
} from './HealthPlanPackageTable'
import { screen, waitFor, within } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { User } from '../../gen/gqlClient'

const submissions: PackageInDashboardType[] = [
    {
        id: '2f7f1274-3927-4367-bec6-870587a0f0c6',
        name: 'MCR-MN-0063-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-09-05',
        status: 'UNLOCKED',
        updatedAt: new Date('2022-09-05T17:42:14.835Z'),
        submissionType: 'Contract action only',
        stateName: 'Minnesota',
    },
    {
        id: '576e5a1e-6ae6-4936-9ee4-7034cb2072dd',
        name: 'MCR-MN-0071-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-12-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-12-05T17:48:59.297Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Florida',
    },
    {
        id: 'a6e5eb04-833f-4050-bab4-6ebe8d1a5e75',
        name: 'MCR-OH-0069-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                fullName: 'Special Needs Basic Care',
                name: 'SNBC',
                isRateProgram: false,
            },
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
            {
                __typename: 'Program',
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                fullName: 'Minnesota Senior Care Plus ',
                name: 'MSC+',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-11-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-11-05T17:47:09.745Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Ohio',
    },
    {
        id: '74c3c976-45d8-49fe-ac76-6ae3147acd12',
        name: 'MCR-PR-0065-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-10-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-10-05T17:45:05.562Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Puerto Rico',
    },
]

const mockCMSUser = (): User => ({
    __typename: 'CMSUser' as const,
    id: 'foo-id',
    givenName: 'Bob',
    familyName: 'Dumas',
    role: 'CMS User',
    email: 'cms@exmaple.com',
    divisionAssignment: 'DMCO',
    stateAssignments: [],
})

const mockStateUser = (): User => ({
    __typename: 'StateUser' as const,
    id: 'foo-id',
    givenName: 'Bob',
    familyName: 'Statie',
    role: 'State User',
    email: 'state@example.com',
    state: {
        __typename: 'State',
        code: 'MN',
        name: 'Minnesota',
        programs: [],
    },
})

const apolloProviderWithStateUser = () => ({
    mocks: [
        fetchCurrentUserMock({
            statusCode: 200,
            user: mockStateUser(),
        }),
    ],
})

const apolloProviderWithCMSUser = () => ({
    mocks: [
        fetchCurrentUserMock({
            statusCode: 200,
            user: mockCMSUser(),
        }),
    ],
})

describe('HealthPlanPackageTable for CMS User (with filters)', () => {
    beforeEach(() => {
        window.location.assign('#')
        vi.clearAllMocks()
    })

    it('renders table and caption if passed in', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                caption="Table 1"
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithStateUser(),
            }
        )
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText('Table 1')).toBeInTheDocument()
    })

    it('renders table with expected number of submissions', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithStateUser(),
            }
        )
        const rows = await screen.findAllByRole('row')
        expect(screen.getByRole('table')).toBeInTheDocument()
        //Expect 5 rows. 4 data rows and 1 header row
        expect(rows).toHaveLength(5)
        expect(
            screen.getByText('Displaying 4 of 4 submissions')
        ).toBeInTheDocument()
    })

    it('displays no submission text when no submitted packages exist', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={[]}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithStateUser(),
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText(/You have no submissions yet/)
            ).toBeInTheDocument()
            expect(screen.queryByRole('table')).toBeNull()
        })
    })

    it('displays submissions table with expected headers for cms users', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )
        const submissionsInTable = screen.getAllByTestId(`submission-id`)
        const table = screen.getByRole('table')
        const [columnNames] = within(table).getAllByRole('rowgroup')
        expect(within(columnNames).getByText(/ID/)).toBeTruthy()
        expect(within(columnNames).getByText(/State/)).toBeTruthy()
        expect(within(columnNames).getByText(/Submission type/)).toBeTruthy()
        expect(within(columnNames).getByText(/Programs/)).toBeTruthy()
        expect(within(columnNames).getByText(/Submission date/)).toBeTruthy()
        expect(within(columnNames).getByText(/Status/)).toBeTruthy()
        expect(submissionsInTable).toHaveLength(4)
    })

    it('displays submissions table sorted by that revisions last updated column', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const rows = await screen.findAllByRole('row')
        expect(
            within(rows[1]).getByTestId('submission-last-updated')
        ).toHaveTextContent('12/05/2022')
        expect(
            within(rows[2]).getByTestId('submission-last-updated')
        ).toHaveTextContent('11/05/2022')
        expect(
            within(rows[3]).getByTestId('submission-last-updated')
        ).toHaveTextContent('10/05/2022')
        expect(
            within(rows[4]).getByTestId('submission-last-updated')
        ).toHaveTextContent('9/05/2022')
    })

    it('has correct submission links for cms users', async () => {
        const stateSubmissions: PackageInDashboardType[] = [
            {
                ...submissions[0],
                id: 'unlocked-submission',
                updatedAt: new Date('12/05/2022'),
                status: 'UNLOCKED',
            },
        ]
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={stateSubmissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const rows = await screen.findAllByRole('row')
        expect(within(rows[1]).getByRole('link')).toHaveAttribute(
            'href',
            `/submissions/unlocked-submission`
        )
    })

    it('displays the expected program tags for current revision that is submitted/resubmitted', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )
        const row1 = await screen.findByTestId(`row-${submissions[0].id}`)
        const tags1 = within(row1).getAllByTestId('program-tag')
        expect(tags1[0]).toHaveTextContent(submissions[0].programs[0].name)
        expect(tags1).toHaveLength(1)

        const row2 = await screen.findByTestId(`row-${submissions[1].id}`)
        const tags2 = within(row2).getAllByTestId('program-tag')
        expect(tags2).toHaveLength(3)
        expect(tags2[0]).toHaveTextContent(submissions[1].programs[0].name)
        expect(tags2[1]).toHaveTextContent(submissions[1].programs[1].name)
        expect(tags2[2]).toHaveTextContent(submissions[1].programs[2].name)

        const row3 = await screen.findByTestId(`row-${submissions[2].id}`)
        const tags3 = within(row3).getAllByTestId('program-tag')
        expect(tags3).toHaveLength(1)
        expect(tags3[0]).toHaveTextContent(submissions[2].programs[0].name)

        const row4 = await screen.findByTestId(`row-${submissions[3].id}`)
        const tags4 = within(row4).getAllByTestId('program-tag')
        expect(tags4).toHaveLength(1)
        expect(tags4[0]).toHaveTextContent(submissions[3].programs[0].name)
    })

    it('should display filters on dashboard page when showFilters is true', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        //Expand filter accordion
        expect(screen.queryByTestId('accordion')).toBeInTheDocument()
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await userEvent.click(accordionButton)

        await waitFor(() => {
            expect(screen.queryByTestId('state-filter')).toBeInTheDocument()
            expect(
                screen.queryByTestId('submissionType-filter')
            ).toBeInTheDocument()
        })
    })

    it('should not display filters on dashboard page when showFilters is false', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('accordion')).not.toBeInTheDocument()
            expect(screen.queryByTestId('state-filter')).not.toBeInTheDocument()
            expect(
                screen.queryByTestId('submissionType-filter')
            ).not.toBeInTheDocument()
        })
    })

    it('can filter table by submission state', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const stateFilter = screen.getByTestId('state-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        //Look for state filter
        const stateCombobox = within(stateFilter).getByRole('combobox')
        expect(stateCombobox).toBeInTheDocument()

        //Open combobox
        selectEvent.openMenu(stateCombobox)
        //Expect combobox options to exist
        const comboboxOptions = screen.getByTestId('state-filter-options')
        expect(comboboxOptions).toBeInTheDocument()

        await waitFor(async () => {
            //Expected options are present
            expect(
                within(comboboxOptions).getByText('Ohio')
            ).toBeInTheDocument()
            expect(
                within(comboboxOptions).getByText('Florida')
            ).toBeInTheDocument()
            expect(
                within(comboboxOptions).getByText('Minnesota')
            ).toBeInTheDocument()
            expect(
                within(comboboxOptions).getByText('Puerto Rico')
            ).toBeInTheDocument()
            //Select option Ohio
            await selectEvent.select(comboboxOptions, 'Ohio')
        })

        //Expect only Ohio to show on table
        const rows = await screen.findAllByRole('row')
        expect(rows).toHaveLength(2)
        expect(rows[1]).toHaveTextContent('Ohio') // row[0] is the header
        expect(
            screen.getByText('Displaying 1 of 4 submissions')
        ).toBeInTheDocument()
    })

    it('can filter by state and submission type', async () => {
        const stateSubmissions: PackageInDashboardType[] = [
            {
                ...submissions[0],
                id: 'one',
                submissionType: 'Contract action only',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'two',
                submissionType: 'Contract action and rate certification',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'three',
                submissionType: 'Contract action and rate certification',
                stateName: 'Ohio',
            },
        ]

        renderWithProviders(
            <HealthPlanPackageTable
                tableData={stateSubmissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const stateFilter = screen.getByTestId('state-filter')
        const submissionTypeFilter = screen.getByTestId('submissionType-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        //Look for state filter
        const stateCombobox = within(stateFilter).getByRole('combobox')
        expect(stateCombobox).toBeInTheDocument()

        //Look for submission type filter
        const submissionTypeCombobox =
            within(submissionTypeFilter).getByRole('combobox')
        expect(submissionTypeCombobox).toBeInTheDocument()

        //Open state combobox and select Minnesota option
        selectEvent.openMenu(stateCombobox)
        const stateOptions = screen.getByTestId('state-filter-options')
        expect(stateOptions).toBeInTheDocument()
        await waitFor(async () => {
            expect(within(stateOptions).getByText('Ohio')).toBeInTheDocument()
            expect(
                within(stateOptions).getByText('Minnesota')
            ).toBeInTheDocument()
            await selectEvent.select(stateOptions, 'Minnesota')
        })

        //Open submission type combobox and select 'Contract action and rate certification' option
        selectEvent.openMenu(submissionTypeCombobox)
        const submissionTypeOptions = screen.getByTestId(
            'submissionType-filter-options'
        )
        expect(submissionTypeOptions).toBeInTheDocument()
        await waitFor(async () => {
            expect(
                within(submissionTypeOptions).getByText('Contract action only')
            ).toBeInTheDocument()
            expect(
                within(submissionTypeOptions).getByText(
                    'Contract action and rate certification'
                )
            ).toBeInTheDocument()
            await selectEvent.select(
                submissionTypeOptions,
                'Contract action and rate certification'
            )
        })

        //Expect only 1 submission filtered from 3 to show on table
        const rows = await screen.findAllByRole('row')
        expect(rows).toHaveLength(2)
        expect(rows[1]).toHaveTextContent('Minnesota') // row[0] is the header
        expect(rows[1]).toHaveTextContent(
            'Contract action and rate certification'
        )
        expect(
            screen.getByText('Displaying 1 of 3 submissions')
        ).toBeInTheDocument()
        expect(global.window.location.href).toContain(
            '#filters=stateName%3DMinnesota%26submissionType%3DContract+action+and+rate+certification'
        )
    })

    it('should clear all filters when clear filter button is clicked', async () => {
        const stateSubmissions: PackageInDashboardType[] = [
            {
                ...submissions[0],
                id: 'one',
                submissionType: 'Contract action only',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'two',
                submissionType: 'Contract action and rate certification',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'three',
                submissionType: 'Contract action and rate certification',
                stateName: 'Ohio',
            },
        ]

        renderWithProviders(
            <HealthPlanPackageTable
                tableData={stateSubmissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const stateFilter = screen.getByTestId('state-filter')
        const submissionTypeFilter = screen.getByTestId('submissionType-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        // Get filter comboboxes
        const stateCombobox = within(stateFilter).getByRole('combobox')
        const submissionTypeCombobox =
            within(submissionTypeFilter).getByRole('combobox')

        //Open state combobox and select Minnesota option
        selectEvent.openMenu(stateCombobox)
        const stateOptions = screen.getByTestId('state-filter-options')
        await waitFor(async () => {
            await selectEvent.select(stateOptions, 'Minnesota')
        })

        //Open submission type combobox and select Contract action and rate certification option
        selectEvent.openMenu(submissionTypeCombobox)
        const submissionTypeOptions = screen.getByTestId(
            'submissionType-filter-options'
        )
        await waitFor(async () => {
            await selectEvent.select(
                submissionTypeOptions,
                'Contract action and rate certification'
            )
        })

        //Expect 1 data row and 1 header row, total 2 rows
        const rows = await screen.findAllByRole('row')
        expect(rows).toHaveLength(2)

        //Click on Clear filters button
        const clearFiltersButton = screen.getByRole('button', {
            name: 'Clear filters',
        })
        expect(clearFiltersButton).toBeInTheDocument()

        //Expect 3 data rows and 1 header row, total 4 rows
        await userEvent.click(clearFiltersButton)
        expect(await screen.findAllByRole('row')).toHaveLength(4)
        expect(
            screen.getByText('Displaying 3 of 3 submissions')
        ).toBeInTheDocument()
        expect(clearFiltersButton).toHaveFocus()
        expect(global.window.location.href).not.toContain('stateName')
        expect(global.window.location.href).not.toContain('submissionType')
    })

    it('displays no results found when filters return no results', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const stateFilter = screen.getByTestId('state-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        //Look for state filter
        const stateCombobox = within(stateFilter).getByRole('combobox')
        expect(stateCombobox).toBeInTheDocument()

        //Open combobox
        selectEvent.openMenu(stateCombobox)
        //Expect combobox options to exist
        const comboboxOptions = screen.getByTestId('state-filter-options')
        expect(comboboxOptions).toBeInTheDocument()

        await waitFor(async () => {
            //Expected options are present
            expect(
                within(comboboxOptions).getByText('Florida')
            ).toBeInTheDocument()
            //Select option Ohio
            await selectEvent.select(comboboxOptions, 'Florida')
        })

        const submissionTypeFilter = screen.getByTestId('submissionType-filter')
        const submissionTypeCombobox =
            within(submissionTypeFilter).getByRole('combobox')

        //Open submission type combobox and select Contract action only option
        selectEvent.openMenu(submissionTypeCombobox)
        const submissionTypeOptions = screen.getByTestId(
            'submissionType-filter-options'
        )
        await waitFor(async () => {
            await selectEvent.select(
                submissionTypeOptions,
                'Contract action only'
            )
        })

        const rows = await screen.findAllByRole('row')
        expect(rows).toHaveLength(1)
        expect(screen.getByText('No results found')).toBeInTheDocument()
        expect(
            screen.getByText('Displaying 0 of 4 submissions')
        ).toBeInTheDocument()
    })

    it('displays the total filters applied', async () => {
        const stateSubmissions: PackageInDashboardType[] = [
            {
                ...submissions[0],
                id: 'one',
                submissionType: 'Contract action only',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'two',
                submissionType: 'Contract action and rate certification',
                stateName: 'Minnesota',
            },
            {
                ...submissions[0],
                id: 'three',
                submissionType: 'Contract action and rate certification',
                stateName: 'Ohio',
            },
            {
                ...submissions[0],
                id: 'four',
                submissionType: 'Contract action and rate certification',
                stateName: 'Ohio',
            },
        ]

        renderWithProviders(
            <HealthPlanPackageTable
                tableData={stateSubmissions}
                user={mockCMSUser()}
                showFilters
            />,
            {
                apolloProvider: apolloProviderWithCMSUser(),
            }
        )

        const stateFilter = screen.getByTestId('state-filter')
        const submissionTypeFilter = screen.getByTestId('submissionType-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        //Expect no filters applied yet
        expect(screen.getByText('Filters')).toBeInTheDocument()

        //Look for state filter
        const stateCombobox = within(stateFilter).getByRole('combobox')
        expect(stateCombobox).toBeInTheDocument()

        //Look for submission type filter
        const submissionTypeCombobox =
            within(submissionTypeFilter).getByRole('combobox')
        expect(submissionTypeCombobox).toBeInTheDocument()

        //Open state combobox and select Minnesota option
        selectEvent.openMenu(stateCombobox)
        const stateOptionOne = screen.getByTestId('state-filter-options')
        expect(stateOptionOne).toBeInTheDocument()
        await waitFor(async () => {
            expect(within(stateOptionOne).getByText('Ohio')).toBeInTheDocument()
            expect(
                within(stateOptionOne).getByText('Minnesota')
            ).toBeInTheDocument()
            await selectEvent.select(stateOptionOne, 'Minnesota')
        })

        //Expect 1 filter applied
        expect(screen.getByText('1 filter applied')).toBeInTheDocument()

        //Open state combobox and select Ohio option
        selectEvent.openMenu(stateCombobox)
        const stateOptionTwo = screen.getByTestId('state-filter-options')
        expect(stateOptionTwo).toBeInTheDocument()
        await waitFor(async () => {
            expect(within(stateOptionTwo).getByText('Ohio')).toBeInTheDocument()
            await selectEvent.select(stateOptionTwo, 'Ohio')
        })

        //Expect 2 filter applied
        expect(screen.getByText('2 filters applied')).toBeInTheDocument()

        //Open submission type combobox and select contact and rate option
        selectEvent.openMenu(submissionTypeCombobox)
        const submissionTypeOptions = screen.getByTestId(
            'submissionType-filter-options'
        )
        expect(submissionTypeOptions).toBeInTheDocument()
        await waitFor(async () => {
            expect(
                within(submissionTypeOptions).getByText('Contract action only')
            ).toBeInTheDocument()
            expect(
                within(submissionTypeOptions).getByText(
                    'Contract action and rate certification'
                )
            ).toBeInTheDocument()
            await selectEvent.select(
                submissionTypeOptions,
                'Contract action and rate certification'
            )
        })

        //Expect 3 submission filtered from 4 to show on table
        const rows = await screen.findAllByRole('row')
        expect(rows).toHaveLength(4)
        //Expect 3 applied filters text
        expect(screen.getByText('3 filters applied')).toBeInTheDocument()
        expect(
            screen.getByText('Displaying 3 of 4 submissions')
        ).toBeInTheDocument()
    })
})

describe('HealthPlanPackageTable state user tests', () => {
    beforeEach(() => {
        window.location.assign('#')
    })

    it('does not display State and Submission type columns for state users', async () => {
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={submissions}
                user={mockStateUser()}
            />,
            {
                apolloProvider: apolloProviderWithStateUser(),
            }
        )
        const submissionsInTable = screen.getAllByTestId(`submission-id`)
        const table = screen.getByRole('table')
        const [columnNames] = within(table).getAllByRole('rowgroup')
        expect(within(columnNames).getByText(/ID/)).toBeTruthy()
        expect(within(columnNames).queryByText(/State/)).not.toBeInTheDocument()
        expect(
            within(columnNames).queryByText(/Submission type/)
        ).not.toBeInTheDocument()
        expect(within(columnNames).getByText(/Programs/)).toBeTruthy()
        expect(within(columnNames).getByText(/Submission date/)).toBeTruthy()
        expect(within(columnNames).getByText(/Status/)).toBeTruthy()
        expect(submissionsInTable).toHaveLength(4)
    })

    it('has correct submission links for state users', async () => {
        const stateSubmissions: PackageInDashboardType[] = [
            {
                ...submissions[0],
                id: 'unlocked-submission',
                updatedAt: new Date('12/05/2022'),
                status: 'UNLOCKED',
            },
            {
                ...submissions[1],
                id: 'submitted-submission',
                updatedAt: new Date('12/04/2022'),
                status: 'SUBMITTED',
            },
            {
                ...submissions[2],
                id: 'draft-submission',
                updatedAt: new Date('12/03/2022'),
                status: 'DRAFT',
            },
        ]
        renderWithProviders(
            <HealthPlanPackageTable
                tableData={stateSubmissions}
                user={mockStateUser()}
            />,
            {
                apolloProvider: apolloProviderWithStateUser(),
            }
        )

        const rows = await screen.findAllByRole('row')
        const submissionLink = (row: number) =>
            within(rows[row]).getByRole('link')
        expect(submissionLink(1)).toHaveAttribute(
            'href',
            `/submissions/unlocked-submission/edit/review-and-submit`
        )
        expect(submissionLink(2)).toHaveAttribute(
            'href',
            `/submissions/submitted-submission`
        )
        expect(submissionLink(3)).toHaveAttribute(
            'href',
            `/submissions/draft-submission/edit/type`
        )
    })
})
