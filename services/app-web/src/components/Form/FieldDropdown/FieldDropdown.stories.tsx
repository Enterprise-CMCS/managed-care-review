import * as Yup from 'yup'
import { Story } from '@storybook/react'
import { Formik } from 'formik'
import { FieldDropdown, FieldDropdownProps } from './FieldDropdown'

export default {
    title: 'Components/Forms/FieldDropdown',
    component: FieldDropdown,
}
const schema = Yup.object().shape({
    program: Yup.string().required('A program is required'),
})

const Template: Story<FieldDropdownProps> = (args) => (
    <Formik
        initialValues={{ program: '' }}
        validationSchema={schema}
        validateOnMount={true}
        onSubmit={(e) => console.info('submitted')}
    >
        <FieldDropdown {...args} />
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    label: 'Program',
    id: 'program',
    showError: false,
    name: 'program',
    options: [
        { id: 'ccc-plus', label: 'CCC Plus' },
        { id: 'medallion', label: 'Medallion' },
    ],
}

export const Hint = Template.bind({})

Hint.args = {
    label: 'Program',
    id: 'program',
    showError: false,
    name: 'program',
    options: [
        { id: 'ccc-plus', label: 'CCC Plus' },
        { id: 'medallion', label: 'Medallion' },
    ],
    hint: <span>You can change your program at any time.</span>,
}

export const Error = Template.bind({})

Error.args = {
    label: 'Program',
    id: 'program',
    showError: true,
    name: 'program',
    'aria-required': 'true',
    options: [
        { id: 'ccc-plus', label: 'CCC Plus' },
        { id: 'medallion', label: 'Medallion' },
    ],
    showDropdownPlaceholderText: true,
}
