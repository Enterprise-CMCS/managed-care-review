import React from 'react'
import { FilterDateRange, FilterDateRangeRef } from './FilterDateRange'
import { renderWithProviders } from '../../../testHelpers'
import { fetchCurrentUserMock } from '../../../testHelpers/apolloMocks'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('FilterDateRange', () => {
    it('returns inputted start and end date', async () => {
        const onStartChange = jest.fn((date?: string) => date)
        const onEndChange = jest.fn((date?: string) => date)
        renderWithProviders(
            <FilterDateRange
                name={'filterDateRange'}
                onStartChange={onStartChange}
                onEndChange={onEndChange}
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
        const onStartChange = jest.fn((date?: string) => date)
        const onEndChange = jest.fn((date?: string) => date)
        renderWithProviders(
            <FilterDateRange
                name={'filterDateRange'}
                startDateDefaultValue={'2024-11-10'}
                endDateDefaultValue={'2025-11-10'}
                onStartChange={onStartChange}
                onEndChange={onEndChange}
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
})
