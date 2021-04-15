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
    label: "test",
    id: "test",
    showError: false,
    name: "test",
    options: [{key: "test", value: "thing"}]
}