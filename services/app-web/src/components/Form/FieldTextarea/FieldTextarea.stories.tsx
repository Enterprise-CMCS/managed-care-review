import * as Yup from 'yup'
import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import { FieldTextarea, TextAreaProps } from './FieldTextarea'
import { Link } from '@trussworks/react-uswds'

export default {
    title: 'Components/Forms/FieldTextarea',
    component: FieldTextarea,
}
const schema = Yup.object().shape({
    submissionDescription: Yup.string().required(
        'You must provide a description of any major changes or updates'
    ),
})

const Template: StoryFn<TextAreaProps> = (args) => (
    <Formik
        initialValues={{ submissionDescription: '' }}
        validationSchema={schema}
        validateOnMount={true}
        onSubmit={(e) => console.info('submitted')}
    >
        <FieldTextarea {...args} />
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    label: 'Submission description',
    id: 'submissionDescription',
    showError: false,
    name: 'submissionDescription',
}

export const Hint = Template.bind({})

Hint.args = {
    label: 'Submission description',
    id: 'submissionDescription',
    showError: false,
    name: 'submissionDescription',
    'aria-required': 'true',
    hint: (
        <>
            <Link
                variant="nav"
                href="https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html"
                target="_blank"
            >
                Managed Care entity definitions
            </Link>
            <span>Provide a description of any major changes or updates</span>
        </>
    ),
}

export const Error = Template.bind({})

Error.args = {
    label: 'Submission description',
    id: 'submissionDescription',
    showError: true,
    name: 'submissionDescription',
}
