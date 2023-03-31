import { Story } from '@storybook/react'
import { ErrorAlertProps, ErrorAlert } from './ErrorAlert'

export default {
    title: 'Components/ErrorAlert',
    component: ErrorAlert,
}

const Template: Story<ErrorAlertProps> = (args) => <ErrorAlert {...args} />

export const Default = Template.bind({})

export const CustomStylesWithLetUsKnowLink = Template.bind({})
CustomStylesWithLetUsKnowLink.args = {
    message:
        'Here is an error alert with extra padding and a light gray background. If you see anything odd,',
    style: { backgroundColor: '#F0F0F0', padding: '2em' },
    appendLetUsKnow: true,
}
