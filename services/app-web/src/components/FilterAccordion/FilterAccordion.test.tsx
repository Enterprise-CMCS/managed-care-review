import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { FilterAccordion } from './FilterAccordion'
import { FilterSelect } from './FilterSelect/FilterSelect'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
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
                onClearFilters={vi.fn()}
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
})
