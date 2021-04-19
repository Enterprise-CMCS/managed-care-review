import React from 'react'
import { Story } from '@storybook/react'
import { Formik } from 'formik'
import { FieldRadio, FieldRadioProps } from './FieldRadio'

export default {
    title: 'Components/Forms/FieldRadio',
    component: FieldRadio
}

const Template: Story<FieldRadioProps> = 
(args) => (
    <Formik
        initialValues={{input1: ''}}
        onSubmit={e => console.log('submitted')}
    >
        <FieldRadio {...args}/>
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    id: "contractOnly", 
    name: "submissionType",
    label: "Executed contract action only",
    checked: false,
    disabled: false
}

export const Selected = Template.bind({})

Selected.args = {
    id: "contractOnly", 
    name: "submissionType",
    label: "Executed contract action only",
    checked: true,
    disabled: false
}

export const Disabled = Template.bind({})

Disabled.args = {
    id: "contractOnly", 
    name: "submissionType",
    label: "Executed contract action only",
    checked: true,
    disabled: true
}
