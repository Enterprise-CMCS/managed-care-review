import { StoryFn } from '@storybook/react'
import { ErrorAlertProps, ErrorAlert } from './ErrorAlert'
import { ErrorAlertFailedRequest } from './ErrorAlertFailedRequest'
import { ErrorAlertSessionExpired } from './ErrorAlertSessionExpired'
import { ErrorAlertSignIn } from './ErrorAlertSignIn'
import { ErrorAlertSiteUnavailable } from './ErrorAlertSiteUnavailable'
import { ErrorAlertScheduledMaintenance } from './ErrorAlertScheduledMaintenance'
import { ErrorAlertValidationError } from './ErrorAlertValidationError'

export default {
    title: 'Components/ErrorAlert',
    component: ErrorAlert,
}

const Template: StoryFn<ErrorAlertProps> = (args) => <ErrorAlert {...args} />

export const Default = Template.bind({})

export const CustomStylesWithContactSupportLink = Template.bind({})
CustomStylesWithContactSupportLink.args = {
    message:
        'Here is an error alert with extra padding and a light gray background.',
    style: { backgroundColor: '#F0F0F0', padding: '2em' },
    remediation: 'DEFAULT',
}

// List of application context-specific error alert components for quick reference.
export const ListOfApplicationErrorAlerts = (): React.ReactElement => (
    <div className="sb-padded">
        <ErrorAlertFailedRequest />
        <ErrorAlertValidationError />
        <ErrorAlertSiteUnavailable />
        <ErrorAlertScheduledMaintenance />
        <ErrorAlertSignIn />
        <ErrorAlertSessionExpired />
    </div>
)
