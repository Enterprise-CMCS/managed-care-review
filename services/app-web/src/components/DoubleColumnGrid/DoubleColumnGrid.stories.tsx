import React from 'react'
import { Story } from '@storybook/react'
import { DoubleColumnGrid, DoubleColumnGridProps } from './DoubleColumnGrid'

export default {
    title: 'Components/DoubleColumnGrid',
    component: DoubleColumnGrid
}

const Template: Story<DoubleColumnGridProps> = (args) => <DoubleColumnGrid {...args}/>

export const DoubleColumnGridEvenChildren = Template.bind({})
DoubleColumnGridEvenChildren.args = {
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
        <h3>Row Two Right Column</h3>,
    ]
}

export const DoubleColumnGridOddChildren = Template.bind({})
DoubleColumnGridOddChildren.args = {
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
    ]
}
