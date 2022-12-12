import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { FilterAccordion } from './FilterAccordion'
import { FilterSelect } from './FilterSelect/FilterSelect'
import { screen, waitFor, within } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'
import { fetchCurrentUserMock } from '../../testHelpers/apolloHelpers'
import React from 'react'

describe('FilterAccordion', () => {
    const stateOptions = [
        { label: 'Alaska', value: 'AK' },
        { label: 'New York', value: 'NY' },
        { label: 'California', value: 'CA' },
        { label: 'Ohio', value: 'OH' },
    ]

    const cityOptions = [
        { label: 'Juneau', value: 'Juneau' },
        { label: 'Albany', value: 'Albany' },
        { label: 'Sacramento', value: 'Sacramento' },
        { label: 'Cleveland', value: 'Cleveland' },
    ]

    const countryOptions = [
        { label: 'United States', value: 'United States' },
        { label: 'Canada', value: 'Canada' },
        { label: 'Mexico', value: 'Mexico' },
        { label: 'Brazil', value: 'Brazil' },
    ]

    const filters = [
        <FilterSelect
            filterOptions={stateOptions}
            name="state"
            label="State"
            key="state"
        />,
        <FilterSelect
            filterOptions={cityOptions}
            name="city"
            label="City"
            key="city"
        />,
        <FilterSelect
            filterOptions={countryOptions}
            name="country"
            label="Country"
            key="country"
        />,
    ]

    it('renders filter accordion and expected filters', async () => {
        renderWithProviders(
            <FilterAccordion
                filterTitle={'Testing filter accordion'}
                children={filters}
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

        expect(screen.getByTestId('accordion')).toBeInTheDocument()
        expect(screen.getByText('Testing filter accordion')).toBeInTheDocument()
        expect(
            screen.getByTestId('accordionButton_filterAccordionItems')
        ).toBeInTheDocument()

        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            await userEvent.click(accordionButton)
        })

        expect(screen.getByTestId('state-filter')).toBeInTheDocument()
        expect(screen.getByTestId('city-filter')).toBeInTheDocument()
        expect(screen.getByTestId('country-filter')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Clear filters' })
        ).toBeInTheDocument()
    })
    it('clears all filters when Clear filters button is clicked', async () => {
        renderWithProviders(
            <FilterAccordion
                filterTitle={'Testing filter accordion'}
                children={filters}
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

        const stateFilter = screen.getByTestId('state-filter')
        const cityFilter = screen.getByTestId('city-filter')
        const countryFilter = screen.getByTestId('country-filter')
        const accordionButton = screen.getByTestId(
            'accordionButton_filterAccordionItems'
        )
        await waitFor(async () => {
            //Expect filter accordion and state filter to exist
            expect(screen.queryByTestId('accordion')).toBeInTheDocument()
            //Expand filter accordion
            await userEvent.click(accordionButton)
        })

        expect(screen.queryByText('Ohio')).not.toBeInTheDocument()
        expect(screen.queryByText('Cleveland')).not.toBeInTheDocument()
        expect(screen.queryByText('United States')).not.toBeInTheDocument()

        const stateCombobox = within(stateFilter).getByRole('combobox')
        const cityCombobox = within(cityFilter).getByRole('combobox')
        const countryCombobox = within(countryFilter).getByRole('combobox')

        await selectEvent.openMenu(stateCombobox)
        const stateOptionsList = screen.getByTestId('state-filter-options')
        await waitFor(async () => {
            expect(
                within(stateOptionsList).getByText('Ohio')
            ).toBeInTheDocument()
            await selectEvent.select(stateOptionsList, 'Ohio')
        })

        await selectEvent.openMenu(cityCombobox)
        const cityOptionsList = screen.getByTestId('city-filter-options')
        await waitFor(async () => {
            expect(
                within(cityOptionsList).getByText('Cleveland')
            ).toBeInTheDocument()
            await selectEvent.select(cityOptionsList, 'Cleveland')
        })

        await selectEvent.openMenu(countryCombobox)
        const countryOptionsList = screen.getByTestId('country-filter-options')
        await waitFor(async () => {
            expect(
                within(countryOptionsList).getByText('United States')
            ).toBeInTheDocument()
            await selectEvent.select(countryOptionsList, 'United States')
        })

        expect(screen.getByText('Ohio')).toBeInTheDocument()
        expect(screen.getByText('Cleveland')).toBeInTheDocument()
        expect(screen.getByText('United States')).toBeInTheDocument()

        const clearFiltersButton = screen.getByRole('button', {
            name: 'Clear filters',
        })
        await waitFor(async () => {
            await userEvent.click(clearFiltersButton)
        })

        expect(screen.queryByText('Ohio')).not.toBeInTheDocument()
        expect(screen.queryByText('Cleveland')).not.toBeInTheDocument()
        expect(screen.queryByText('United States')).not.toBeInTheDocument()
    })
})
