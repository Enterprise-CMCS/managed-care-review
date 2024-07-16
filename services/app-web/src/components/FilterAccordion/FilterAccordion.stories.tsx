import React from 'react'
import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { FilterAccordion, FilterAccordionPropType } from './FilterAccordion'
import { FilterSelect } from './FilterSelect/FilterSelect'

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
    <FilterSelect filterOptions={stateOptions} name="State" label="State" />,
    <FilterSelect filterOptions={cityOptions} name="City" label="City" />,
    <FilterSelect
        filterOptions={countryOptions}
        name="Country"
        label="Country"
    />,
]

export default {
    title: 'Components/FilterAccordion/FilterAccordion',
    component: FilterAccordion,
}

const Template: StoryFn<FilterAccordionPropType> = (args) => {
    return <FilterAccordion {...args}>{args.children}</FilterAccordion>
}

export const Default = Template.bind({})

Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
Default.args = {
    filterTitle: 'Filters',
    children: filters,
}
