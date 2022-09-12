import { Story } from '@storybook/react'

import { ErrorAlert, ErrorAlertProps } from './ErrorAlert'
import { ErrorAlertSiteUnavailable } from './ErrorAlertSiteUnavailable'
import { ErrorAlertSignIn } from './ErrorAlertSignIn'

export default {
    title: 'Components/Banner/ErrorAlert',
    component: ErrorAlert,
}

const Template: Story<ErrorAlertProps> = (args) => <ErrorAlert {...args} />

export const ErrorAlertDefault = Template.bind({})

export const ErrorAlertCustomStyles = Template.bind({})
ErrorAlertCustomStyles.args = {
    message:
        'Here is an alert with extra padding around it. If you see anything odd,',
    style: { backgroundColor: 'red' },
}

// List of application context-specific error alert components for quick reference.
export const ApplicationErrorAlerts = (): React.ReactElement => (
    <div className="sb-padded">
        <ErrorAlertSiteUnavailable />
        <ErrorAlertSignIn />
    </div>
)
