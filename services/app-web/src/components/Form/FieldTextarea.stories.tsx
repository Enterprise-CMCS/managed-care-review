import React from 'react'
import { Story } from '@storybook/react'
import { Formik } from 'formik'
import { FormTextarea, TextAreaProps } from './FieldTextarea'
import { Link } from '@trussworks/react-uswds'

export default {
    title: 'Components/Forms/FieldTextarea',
    component: FormTextarea
}

const Template: Story<TextAreaProps> = (args) => (
    <Formik
        initialValues={{input1: ''}}
        onSubmit={e => console.log('submitted')}
    >
        <FormTextarea {...args}/>
    </Formik>
)

export const Draft = Template.bind({})

Draft.args = {
    label: "Submission description",
    id: "submission-description",
    showError: false,
    name: "submission-description"
}

export const Hint = Template.bind({})

Hint.args = {
    label: "Submission description",
    id: "submission-description",
    showError: false,
    name: "submission-description",
    hint:
        <>
            <Link
                variant="nav"
                href="https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html"
                target="_blank"
            >Managed Care entity definitions</Link>
            <span>Provide a description of any major changes or updates</span>
        </>
}

export const Error = Template.bind({})

Error.args = {
    label: "Submission description",
    id: "submission-description",
    showError: true,
    name: "submission-description",
    error: "You must provide a description of any major changes or updates"
}