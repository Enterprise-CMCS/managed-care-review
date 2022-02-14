import React from 'react'
import { Story } from '@storybook/react'
import { DoubleColumnRows, DoubleColumnRowsProps } from './DoubleColumnRows'

export default {
    title: 'Components/DoubleColumnRows',
    component: DoubleColumnRows
}

const Template: Story<DoubleColumnRowsProps> = (args) => <DoubleColumnRows {...args}/>

export const DoubleColumnRowsEvenChildren = Template.bind({})
DoubleColumnRowsEvenChildren.args = {
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
        <h3>Row Two Right Column</h3>,
    ]
}

export const DoubleColumnRowsOddChildren = Template.bind({})
DoubleColumnRowsOddChildren.args = {
    children: [
        <h3>Row One Left Column</h3>,
        <h3>Row One Right Column</h3>,
        <h3>Row Two Left Column</h3>,
    ]
}
