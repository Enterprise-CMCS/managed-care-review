import React from 'react'
import { StoryFn } from '@storybook/react'
import { MultiColumnGrid, MultiColumnGridProps } from './MultiColumnGrid'

export default {
    title: 'Components/MultiColumnGrid',
    component: MultiColumnGrid,
    argTypes: {
        columns: {
            options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            control: 'select',
            table: {
                type: {
                    summary: '1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12',
                },
            },
        },
    },
}

const Template: StoryFn<MultiColumnGridProps> = (args) => (
    <MultiColumnGrid {...args} />
)

export const MultiColumnGridEvenChildren = Template.bind({})
MultiColumnGridEvenChildren.args = {
    columns: 2,
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
        <h3>Row Two Right Column</h3>,
    ],
}

export const MultiColumnGridOddChildren = Template.bind({})
MultiColumnGridOddChildren.args = {
    columns: 2,
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
    ],
}
