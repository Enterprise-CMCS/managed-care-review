import React from 'react'
import { FilterDateRange, FilterDateRangeRef } from './FilterDateRange'
import { renderWithProviders } from '../../../testHelpers'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('FilterDateRange', () => {
    it('returns inputted start and end date', async () => {
        const onStartChange = vi.fn((date?: string) => date)
        const onEndChange = vi.fn((date?: string) => date)
        renderWithProviders(
            <FilterDateRange
                startDatePickerProps={{
                    id: 'ratingPeriodStartPicker',
                    name: 'ratingPeriodStartPicker',
                    onChange: onStartChange,
                }}
                endDatePickerProps={{
                    id: 'ratingPeriodEndPicker',
                    name: 'ratingPeriodEndPicker',
                    onChange: onEndChange,
                }}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        const datePickerInputs = screen.queryAllByTestId(
            'date-picker-external-input'
        )
        const startDateInput = datePickerInputs[0]
        const endDateInput = datePickerInputs[1]

        expect(startDateInput).toBeInTheDocument()
        expect(endDateInput).toBeInTheDocument()

        // Input dates into start and end dates
        await userEvent.type(startDateInput, '11/10/2024')
        await userEvent.type(endDateInput, '11/10/2025')

        // expect our functions to return those dates
        expect(onStartChange).toHaveBeenLastCalledWith('2024-11-10')
        expect(onEndChange).toHaveBeenLastCalledWith('2025-11-10')
        // expect the inputs to be what we inputted
        expect(startDateInput).toHaveAttribute('value', '11/10/2024')
        expect(endDateInput).toHaveAttribute('value', '11/10/2025')
    })

    it('can clear inputs with forward refs', async () => {
        const ref = React.createRef<FilterDateRangeRef>()
        const onStartChange = vi.fn((date?: string) => date)
        const onEndChange = vi.fn((date?: string) => date)
        renderWithProviders(
            <FilterDateRange
                startDatePickerProps={{
                    id: 'ratingPeriodStartPicker',
                    name: 'ratingPeriodStartPicker',
                    defaultValue: '2024-11-10',
                    onChange: onStartChange,
                }}
                endDatePickerProps={{
                    id: 'ratingPeriodEndPicker',
                    name: 'ratingPeriodEndPicker',
                    defaultValue: '2025-11-10',
                    onChange: onEndChange,
                }}
                ref={ref}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        const datePickerInputs = screen.queryAllByTestId(
            'date-picker-external-input'
        )
        const startDateInput = datePickerInputs[0]
        const endDateInput = datePickerInputs[1]

        // except our default values to be in the inputs
        expect(startDateInput).toHaveAttribute('value', '11/10/2024')
        expect(endDateInput).toHaveAttribute('value', '11/10/2025')

        // use the ref to call clearFilter function.
        await waitFor(() => {
            ref?.current?.clearFilter()
        })

        // expect our default values to be removed and the inputs are now empty strings
        expect(startDateInput).toHaveAttribute('value', '')
        expect(endDateInput).toHaveAttribute('value', '')

        // input new dates
        await userEvent.type(startDateInput, '11/10/2026')
        await userEvent.type(endDateInput, '11/10/2027')

        // expect inputs to reflect what we typed
        expect(startDateInput).toHaveAttribute('value', '11/10/2026')
        expect(endDateInput).toHaveAttribute('value', '11/10/2027')

        // use the ref to call clearFilter function.
        await waitFor(() => {
            ref?.current?.clearFilter()
        })

        // expect our inputted values to be removed and the inputs are now empty strings
        expect(startDateInput).toHaveAttribute('value', '')
        expect(endDateInput).toHaveAttribute('value', '')
    })

    it('shows error on invalid date input', async () => {
        const ref = React.createRef<FilterDateRangeRef>()
        const onStartChange = vi.fn((date?: string) => date)
        const onEndChange = vi.fn((date?: string) => date)
        renderWithProviders(
            <FilterDateRange
                startDatePickerProps={{
                    id: 'ratingPeriodStartPicker',
                    name: 'ratingPeriodStartPicker',
                    onChange: onStartChange,
                }}
                endDatePickerProps={{
                    id: 'ratingPeriodEndPicker',
                    name: 'ratingPeriodEndPicker',
                    onChange: onEndChange,
                }}
                ref={ref}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        const datePickerInputs = screen.queryAllByTestId(
            'date-picker-external-input'
        )
        const startDateInput = datePickerInputs[0]
        const endDateInput = datePickerInputs[1]

        expect(startDateInput).toBeInTheDocument()
        expect(endDateInput).toBeInTheDocument()

        // Input dates into start date
        await userEvent.type(startDateInput, '11/11/201')
        // Tab out of the input
        await userEvent.tab()

        // expect the input to be what we inputted
        expect(startDateInput).toHaveAttribute('value', '11/11/201')

        // expect one date error to be shown
        const filterDateRange = screen.getByTestId('filter-date-range-picker')
        expect(
            within(filterDateRange).queryAllByText(
                'You must enter a valid date'
            )
        ).toHaveLength(1)

        // Input dates into end date
        await userEvent.type(endDateInput, '11/11/20434')
        // Tab out of the input
        await userEvent.tab()

        // expect the input to be what we inputted
        expect(endDateInput).toHaveAttribute('value', '11/11/20434')

        // expect two date errors to be shown
        expect(
            within(filterDateRange).queryAllByText(
                'You must enter a valid date'
            )
        ).toHaveLength(2)

        // use the ref to call clearFilter function.
        await waitFor(() => {
            ref?.current?.clearFilter()
        })

        // expect no date errors to be shown
        expect(
            within(filterDateRange).queryAllByText(
                'You must enter a valid date'
            )
        ).toHaveLength(0)

        // expect error to show when start date is greater than end date
        await userEvent.type(endDateInput, '11/11/2000')
        await userEvent.type(startDateInput, '11/11/2043')
        await userEvent.tab()

        // expect no date errors to be shown
        expect(
            within(filterDateRange).queryAllByText(
                'You must enter a valid date'
            )
        ).toHaveLength(2)
    })
})
