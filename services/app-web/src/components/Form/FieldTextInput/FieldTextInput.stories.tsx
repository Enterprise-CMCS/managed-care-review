import * as Yup from 'yup'
import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import { FieldTextInput, TextInputProps } from './FieldTextInput'

export default {
    title: 'Components/Forms/FieldTextInput',
    component: FieldTextInput,
}
const schema = Yup.object().shape({
    documentDescription: Yup.string().required(
        'You must provide a description of this document'
    ),
})

const Template: StoryFn<TextInputProps> = (args) => (
    <Formik
        initialValues={{ submissionDescription: '' }}
        validationSchema={schema}
        validateOnMount={true}
        onSubmit={(e) => console.info('submitted')}
    >
        <FieldTextInput {...args} />
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    label: 'Document description',
    id: 'documentDescription',
    showError: false,
    name: 'documentDescription',
}

export const Hint = Template.bind({})

Hint.args = {
    label: 'Document description',
    id: 'documentDescription',
    showError: false,
    name: 'documentDescription',
    'aria-required': 'true',
    hint: (
        <>
            <span>
                Provide a brief description of what this document is about
            </span>
        </>
    ),
}

export const Error = Template.bind({})

Error.args = {
    label: 'Document description',
    id: 'documentDescription',
    showError: true,
    name: 'documentDescription',
}
