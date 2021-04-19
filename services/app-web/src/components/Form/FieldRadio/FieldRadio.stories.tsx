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
    name: "submissionType",
    legend: "Choose a submission type",
    showError: false,
    options: [{id: "contractOnly", label: "Executed contract action only"}, {id: "contractRate", label: "Executed contract action and signed rate certification"}], 
}

export const Hint = Template.bind({})

Hint.args = {
    name: "submissionType",
    legend: "Choose a submission type",
    showError: false,
    options: [{id: "contractOnly", label: "Executed contract action only"}, {id: "contractRate", label: "Executed contract action and signed rate certification"}],
    hint: <span>This is an example of hint text</span>
}

export const Error = Template.bind({})

Error.args = {
    name: "submissionType",
    legend: "Choose a submission type",
    showError: true,
    options: [{id: "contractOnly", label: "Executed contract action only"}, {id: "contractRate", label: "Executed contract action and signed rate certification"}],
    error: "You must choose a submission type"
}
