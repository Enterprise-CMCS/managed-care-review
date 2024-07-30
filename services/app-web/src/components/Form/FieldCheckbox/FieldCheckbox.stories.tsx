import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import { FieldCheckbox, FieldCheckboxProps } from './FieldCheckbox'

export default {
    title: 'Components/Forms/FieldCheckbox',
    component: FieldCheckbox,
}

const Template: StoryFn<FieldCheckboxProps> = (args) => (
    <Formik
        initialValues={{ input1: '' }}
        onSubmit={(e) => console.info('submitted')}
    >
        <FieldCheckbox {...args} />
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    name: 'managedCareEntity',
    id: 'mco',
    label: 'Managed Care Organization (MCO)',
    heading: 'Managed Care entities',
    parent_component_heading: 'Contract Details Form',
}
