import { Story } from '@storybook/react'
import React from 'react'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { DataDetail, DataDetailContactField, DataDetailDateRange } from './'
import type { DataDetailProps } from './'

export default {
    title: 'Components/DataDetail',
    component: DataDetail,
    parameters: {
        componentSubtitle:
            'DataDetail displays definition terms and descriptions using semantic HTML. This is useful for summarizing static data.',
    },
}
const Template: Story<DataDetailProps> = (args) => (
    <dl>
        <DataDetail {...args} />
    </dl>
)

export const WithString = Template.bind({})
WithString.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithString.args = {
    id: 'rainfall',
    label: 'Average rainfall in May',
    data: '31.58 inches',
}

export const WithMissingField = Template.bind({})
WithMissingField.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithMissingField.args = {
    id: 'crystal-ball',
    label: 'The secret to the future',
    data: undefined,
    explainMissingData: true,
}

export const WithCheckboxList = Template.bind({})
WithCheckboxList.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithCheckboxList.args = {
    id: 'crystal-ball',
    label: 'The secret to the future',
    data: ['this', 'that', 'the other thing'],
}

export const WithDateRange = Template.bind({})
WithDateRange.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithDateRange.args = {
    id: 'time-period',
    label: 'Time wasted',
    data: (
        <DataDetailDateRange
            startDate={new Date(Date.UTC(2022, 5, 21))}
            endDate={new Date(Date.UTC(2022, 5, 22))}
        />
    ),
}

export const WithContact = Template.bind({})
WithContact.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithContact.args = {
    id: 'legal-expert',
    label: 'Legal expert',
    data: (
        <DataDetailContactField
            contact={{
                name: 'Bob Loblaw',
                titleRole: 'Attorney at Law',
                email: 'bob@example.com',
            }}
        />
    ),
}
