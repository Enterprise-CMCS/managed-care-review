import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import { FieldRadio, FieldRadioProps } from './FieldRadio'

export default {
    title: 'Components/Forms/FieldRadio',
    component: FieldRadio,
}

const Template: StoryFn<FieldRadioProps> = (args) => (
    <Formik
        initialValues={{ input1: '' }}
        onSubmit={(e) => console.info('submitted')}
    >
        <FieldRadio {...args} />
    </Formik>
)

export const Default = Template.bind({})

Default.args = {
    name: 'submissionType',
    id: 'contractOnly',
    label: 'Executed contract action only',
}
