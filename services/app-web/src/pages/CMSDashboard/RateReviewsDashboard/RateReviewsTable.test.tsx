import { renderWithProviders } from '../../../testHelpers'
import { RateInDashboardType } from './RateReviewsTable'
import {
    fetchCurrentUserMock,
    iterableCmsUsersMockData,
    mockMNState,
    mockValidAdminUser,
} from '@mc-review/mocks'
import { RateReviewsTable } from './RateReviewsTable'
import { waitFor, screen, within } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'

describe('RateReviewsTable', () => {
    afterEach(() => {
        // Reset url and hash to prevent jotai from saving filters between tests.
        window.history.pushState({}, '', '')
        window.location.hash = ''
    })

    const statePrograms = mockMNState().programs
    const tableData = (): RateInDashboardType[] => [
        {
            id: 'rate-1-id',
            name: 'rate-1-certification-name',
            rateNumber: 1,
            programs: [statePrograms[0]],
            submittedAt: '2023-10-16',
            rateDateStart: new Date('2023-10-16'),
            rateDateEnd: new Date('2024-10-16'),
            status: 'SUBMITTED',
            updatedAt: new Date('2023-10-16'),
            rateType: 'NEW',
            stateName: 'Minnesota',
        },
        {
            id: 'rate-2-id',
            name: 'rate-2-certification-name',
            rateNumber: 1,
            programs: [statePrograms[0]],
            submittedAt: '2023-11-18',
            rateDateStart: new Date('2023-11-18'),
            rateDateEnd: new Date('2024-11-18'),
            status: 'SUBMITTED',
            updatedAt: new Date('2023-11-18'),
            rateType: 'AMENDMENT',
            stateName: 'Ohio',
        },
        {
            id: 'rate-3-id',
            name: 'rate-3-certification-name',
            programs: [statePrograms[0]],
            rateNumber: 2,
            submittedAt: '2023-12-01',
            rateDateStart: new Date('2023-12-01'),
            rateDateEnd: new Date('2024-12-01'),
            status: 'UNLOCKED',
            updatedAt: new Date('2023-12-01'),
            rateType: 'NEW',
            stateName: 'Florida',
        },
    ]

    describe.each(iterableCmsUsersMockData)(
        '$userRole RateReviewsTable tests',
        ({ mockUser }) => {
            it('renders rates table correctly', async () => {
                renderWithProviders(
                    <RateReviewsTable
                        tableData={tableData()}
                        caption={'Test table caption'}
                    />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                            ],
                        },
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByText('Displaying 3 of 3 rate reviews')
                    ).toBeInTheDocument()
                })
                // expect filter accordion to be present
                expect(screen.getByTestId('accordion')).toBeInTheDocument()
                expect(
                    screen.getByText('0 filters applied')
                ).toBeInTheDocument()

                // expect table caption
                expect(
                    screen.getByText('Test table caption')
                ).toBeInTheDocument()

                const tableRows = screen.getAllByRole('row')

                // expect there to be 4 rows, one of which is the header row
                expect(tableRows).toHaveLength(4)

                // expect rows to be in order where latest updatedAt is first in the array
                expect(
                    within(tableRows[1]).getByText('rate-3-certification-name')
                ).toBeInTheDocument()
                expect(
                    within(tableRows[2]).getByText('rate-2-certification-name')
                ).toBeInTheDocument()
                expect(
                    within(tableRows[3]).getByText('rate-1-certification-name')
                ).toBeInTheDocument()
            })
            it('renders rates table correctly without filters, captions and no rates', async () => {
                renderWithProviders(<RateReviewsTable tableData={[]} />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockUser(),
                            }),
                        ],
                    },
                })

                // expect no filter accordion to be present
                expect(
                    screen.queryByTestId('accordion')
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByText('0 filters applied')
                ).not.toBeInTheDocument()

                // expect no table
                expect(screen.queryByRole('table')).not.toBeInTheDocument()

                // expect now rate review text
                expect(
                    screen.getByText('You have no rate reviews yet')
                ).toBeInTheDocument()
            })
            it('can filter table by submission state', async () => {
                renderWithProviders(
                    <RateReviewsTable tableData={tableData()} />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                            ],
                        },
                    }
                )

                const stateFilter = screen.getByTestId('state-filter')
                const accordionButton = screen.getByTestId(
                    'accordionButton_filterAccordionItems'
                )
                await waitFor(async () => {
                    //Expect filter accordion and state filter to exist
                    expect(
                        screen.queryByTestId('accordion')
                    ).toBeInTheDocument()
                    //Expand filter accordion
                    await userEvent.click(accordionButton)
                })

                //Look for state filter
                const stateCombobox = within(stateFilter).getByRole('combobox')
                expect(stateCombobox).toBeInTheDocument()

                //Open combobox
                selectEvent.openMenu(stateCombobox)
                //Expect combobox options to exist
                const comboboxOptions = screen.getByTestId(
                    'state-filter-options'
                )
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
                    //Select option Ohio
                    await selectEvent.select(comboboxOptions, 'Ohio')
                })

                //Expect only Ohio to show on table
                const rows = await screen.findAllByRole('row')
                expect(rows).toHaveLength(2)
                expect(rows[1]).toHaveTextContent('Ohio') // row[0] is the header
                expect(
                    screen.getByText('Displaying 1 of 3 rate reviews')
                ).toBeInTheDocument()
            })
            it('can filter on date ranges', async () => {
                const data = tableData()
                renderWithProviders(<RateReviewsTable tableData={data} />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockUser(),
                            }),
                        ],
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.getByText('Displaying 3 of 3 rate reviews')
                    ).toBeInTheDocument()
                })

                const accordionButton = screen.getByTestId(
                    'accordionButton_filterAccordionItems'
                )

                await waitFor(async () => {
                    //Expect filter accordion and state filter to exist
                    expect(
                        screen.queryByTestId('accordion')
                    ).toBeInTheDocument()
                    //Expand filter accordion
                    await userEvent.click(accordionButton)
                })

                const ratingPeriodFilter = screen.getByTestId(
                    'filter-date-range-picker'
                )
                const dateRangePickerInputs = within(
                    ratingPeriodFilter
                ).queryAllByTestId('date-picker-external-input')
                const startDateFromInput = dateRangePickerInputs[0]
                const startDateToInput = dateRangePickerInputs[1]

                expect(startDateFromInput).toBeInTheDocument()
                expect(startDateToInput).toBeInTheDocument()

                // filter rates by start date from 11/01/2023
                await userEvent.type(startDateFromInput, '11/01/2023')

                // expect to only show rates with start dates on or after 11/01/2023
                const firstFilterRows = await screen.findAllByRole('row')
                expect(firstFilterRows).toHaveLength(3)
                expect(
                    within(firstFilterRows[1]).getByText(
                        'rate-3-certification-name'
                    )
                ).toBeInTheDocument()
                expect(
                    within(firstFilterRows[2]).getByText(
                        'rate-2-certification-name'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Displaying 2 of 3 rate reviews')
                ).toBeInTheDocument()

                // filter rates by start date from 11/01/2023 to 11/30/2024
                await userEvent.type(startDateToInput, '11/30/2023')

                // only one rate rate-2-certification-name should be visible
                const secondFilterRows = await screen.findAllByRole('row')
                expect(secondFilterRows).toHaveLength(2)
                expect(
                    within(secondFilterRows[1]).getByText(
                        'rate-2-certification-name'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Displaying 1 of 3 rate reviews')
                ).toBeInTheDocument()

                // filter rates by start to before 11/30/2023 and removing the from date input
                await userEvent.clear(startDateFromInput)

                // expect to only show rates with end dates on or before 11/30/2023
                const thirdFilterRows = await screen.findAllByRole('row')
                expect(thirdFilterRows).toHaveLength(3)
                expect(
                    within(thirdFilterRows[1]).getByText(
                        'rate-2-certification-name'
                    )
                ).toBeInTheDocument()
                expect(
                    within(thirdFilterRows[2]).getByText(
                        'rate-1-certification-name'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Displaying 2 of 3 rate reviews')
                ).toBeInTheDocument()

                const clearFilterButton = screen.getByRole('button', {
                    name: /Clear filters/,
                })
                expect(clearFilterButton).toBeInTheDocument()

                // Clear all filters
                await userEvent.click(clearFilterButton)

                // expect all rates to be displayed
                expect(
                    screen.getByText('Displaying 3 of 3 rate reviews')
                ).toBeInTheDocument()
            })

            it('does not render rate number by default', async () => {
                renderWithProviders(
                    <RateReviewsTable
                        tableData={tableData()}
                        caption={'Test table caption'}
                    />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                            ],
                        },
                    }
                )

                await screen.findByText('Rate period start date')
                expect(screen.queryByText('Rate #')).toBeNull()
            })
        }
    )

    it('renders rate number for Admin users', async () => {
        renderWithProviders(
            <RateReviewsTable
                tableData={tableData()}
                caption={'Test table caption'}
                isAdminUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidAdminUser(),
                        }),
                    ],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText('Rate period start date')
            ).toBeInTheDocument()
            expect(screen.getByText('Rate #')).toBeInTheDocument()
        })
    })
})
