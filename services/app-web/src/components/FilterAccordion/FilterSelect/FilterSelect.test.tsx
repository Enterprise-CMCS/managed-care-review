import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { FilterSelect } from './FilterSelect'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'

describe('FilterSelect', () => {
    const filterOptions = [
        {
            label: 'Apple',
            value: 'Apple',
        },
        {
            label: 'Orange',
            value: 'Orange',
        },
        {
            label: 'Banana',
            value: 'Banana',
        },
        {
            label: 'Grape',
            value: 'Grape',
        },
    ]
    it('displays filter label when label is passed as prop', () => {
        renderWithProviders(
            <FilterSelect
                name={'fruit'}
                label={'Fruit'}
                filterOptions={filterOptions}
            />
        )

        expect(screen.getByLabelText('Fruit')).toBeInTheDocument()
    })

    it('does not display filter label when label is not passed as prop', () => {
        renderWithProviders(
            <FilterSelect name={'fruit'} filterOptions={filterOptions} />
        )

        expect(screen.queryByText('Fruit')).not.toBeInTheDocument()
    })

    it('displays filter options', async () => {
        renderWithProviders(
            <FilterSelect
                name={'fruit'}
                label={'Fruit'}
                filterOptions={filterOptions}
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
        const combobox = await screen.findByRole('combobox')

        await selectEvent.openMenu(combobox)

        await waitFor(() => {
            expect(screen.getByText('Apple')).toBeInTheDocument()
            expect(screen.getByText('Orange')).toBeInTheDocument()
            expect(screen.getByText('Banana')).toBeInTheDocument()
            expect(screen.getByText('Grape')).toBeInTheDocument()
        })
    })

    it('displays selected options', async () => {
        renderWithProviders(
            <FilterSelect
                name="fruit"
                label="Fruit"
                filterOptions={filterOptions}
                toggleClearFilter={false}
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
        const combobox = await screen.findByRole('combobox')

        //Open select drop down and check for options
        await selectEvent.openMenu(combobox)
        await waitFor(() => {
            expect(screen.getByText('Apple')).toBeInTheDocument()
            expect(screen.getByText('Orange')).toBeInTheDocument()
            expect(screen.getByText('Banana')).toBeInTheDocument()
            expect(screen.getByText('Grape')).toBeInTheDocument()
        })

        //Select two options
        await selectEvent.select(
            screen.getByTestId('fruit-filter-options'),
            'Apple'
        )
        await selectEvent.openMenu(combobox)
        await selectEvent.select(
            screen.getByTestId('fruit-filter-options'),
            'Grape'
        )

        //With dropdown closed expect only selected options to be on the page
        await waitFor(() => {
            expect(screen.queryByText('Apple')).toBeInTheDocument()
            expect(screen.queryByText('Grape')).toBeInTheDocument()
            expect(screen.queryByText('Orange')).not.toBeInTheDocument()
            expect(screen.queryByText('Banana')).not.toBeInTheDocument()
        })
    })
})
