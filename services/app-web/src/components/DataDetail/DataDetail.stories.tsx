import { StoryFn } from '@storybook/react'
import React from 'react'
import { DataDetail } from './DataDetail'
import type { DataDetailProps } from './DataDetail'

export default {
    title: 'Components/DataDetail',
    component: DataDetail,
    parameters: {
        componentSubtitle:
            'DataDetail displays definition terms and descriptions using semantic HTML. This is useful for summarizing static data.',
    },
}

const Template: StoryFn<DataDetailProps> = (args) => (
    <dl>
        <DataDetail {...args} />
    </dl>
)

export const WithString = Template.bind({})
WithString.args = {
    id: 'rainfall',
    label: 'Average rainfall in May',
    children: '1.58 inches',
}

export const WithMissingField = Template.bind({})
WithMissingField.args = {
    id: 'crystal-ball',
    label: 'The secret to the future',
    children: undefined,
    explainMissingData: true,
}
