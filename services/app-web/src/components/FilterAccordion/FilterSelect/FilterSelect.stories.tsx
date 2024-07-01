import { StoryFn } from '@storybook/react'
import { FilterSelect, FilterSelectPropType } from './FilterSelect'
import React from 'react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

const filterOptions = [
    { label: 'Alaska', value: 'AK' },
    { label: 'New York', value: 'NY' },
    { label: 'California', value: 'CA' },
    { label: 'Ohio', value: 'OH' },
]

export default {
    title: 'Components/FilterAccordion/FilterSelect',
    component: FilterSelect,
}

const Template: StoryFn<FilterSelectPropType> = (args) => (
    <FilterSelect {...args} />
)

export const Default = Template.bind({})

Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
Default.args = {
    name: 'state',
    filterOptions,
    label: 'State',
}
