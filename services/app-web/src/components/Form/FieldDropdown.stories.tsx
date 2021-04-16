import React from 'react'
import { Story } from '@storybook/react'
import { Formik } from 'formik'
import { FieldDropdown, FieldDropdownProps } from './FieldDropdown'

export default {
    title: 'Components/Forms/FieldDropdown',
    component: FieldDropdown
}

const Template: Story<FieldDropdownProps> = (args) => (
    <Formik
        initialValues={{input1: ''}}
        onSubmit={e => console.log('submitted')}
    >
        <FieldDropdown {...args}/>
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    label: "Program",
    id: "program",
    showError: false,
    name: "program",
    options: [{key: "ccc-plus", value: "CCC Plus"}, {key: "medallion", value: "Medallion"}]
}

export const Hint = Template.bind({})

Hint.args = {
    label: "Program",
    id: "program",
    showError: false,
    name: "program",
    options: [{key: "ccc-plus", value: "CCC Plus"}, {key: "medallion", value: "Medallion"}],
    hint: <span>You can change your program at any time.</span>
}

export const Error = Template.bind({})

Error.args = {
    label: "Program",
    id: "program",
    showError: true,
    name: "program",
    options: [{key: "ccc-plus", value: "CCC Plus"}, {key: "medallion", value: "Medallion"}],
    showDropdownPlaceholderText: true,
    error: "You must select a program"
}