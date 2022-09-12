import { Story } from '@storybook/react'

import { ErrorAlert, ErrorAlertProps } from './ErrorAlert'
import { ErrorAlertSiteUnavailable } from './ErrorAlertSiteUnavailable'
import { ErrorAlertSignIn } from './ErrorAlertSignIn'

export default {
    title: 'Components/ErrorAlerts',
    component: ErrorAlert,
}

const Template: Story<ErrorAlertProps> = (args) => <ErrorAlert {...args} />

export const Default = Template.bind({})

export const CustomStyles = Template.bind({})
CustomStyles.args = {
    message:
        'Here is an error alert with extra padding and a light gray background. If you see anything odd,',
    style: { backgroundColor: '#F0F0F0', padding: '2em' },
}

// List of application context-specific error alert components for quick reference.
export const ListOfApplicationErrorAlerts = (): React.ReactElement => (
    <div className="sb-padded">
        <ErrorAlertSiteUnavailable />
        <ErrorAlertSignIn />
    </div>
)
