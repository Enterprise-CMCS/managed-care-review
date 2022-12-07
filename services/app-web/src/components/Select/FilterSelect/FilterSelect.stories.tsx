import { Story } from '@storybook/react'
import { FilterSelect, FilterSelectPropType } from '../index'
import React from 'react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

const filterOptions = [
    { label: 'Alaska', value: 'AK' },
    { label: 'New York', value: 'NY' },
    { label: 'California', value: 'CA' },
    { label: 'Ohio', value: 'OH' },
]

export default {
    title: 'Components/Select/FilterSelect',
    component: FilterSelect,
}

const Template: Story<FilterSelectPropType> = (args) => (
    <FilterSelect {...args} />
)

export const Default = Template.bind({})

Default.decorators = [(Story) => ProvidersDecorator(Story, {})]
Default.args = {
    name: 'state',
    filterOptions,
    label: 'State',
}
