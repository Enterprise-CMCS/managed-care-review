import { StoryFn } from '@storybook/react'
import { ErrorAlertProps, ErrorAlert } from './ErrorAlert'
import { ErrorAlertFailedRequest } from './ErrorAlertFailedRequest'
import { ErrorAlertSessionExpired } from './ErrorAlertSessionExpired'
import { ErrorAlertSignIn } from './ErrorAlertSignIn'
import { ErrorAlertSiteUnavailable } from './ErrorAlertSiteUnavailable'

export default {
    title: 'Components/ErrorAlert',
    component: ErrorAlert,
}

const Template: StoryFn<ErrorAlertProps> = (args) => <ErrorAlert {...args} />

export const Default = Template.bind({})

export const CustomStylesWithLetUsKnowLink = Template.bind({})
CustomStylesWithLetUsKnowLink.args = {
    message:
        'Here is an error alert with extra padding and a light gray background. If you see anything odd,',
    style: { backgroundColor: '#F0F0F0', padding: '2em' },
    appendLetUsKnow: true,
}

// List of application context-specific error alert components for quick reference.
export const ListOfApplicationErrorAlerts = (): React.ReactElement => (
    <div className="sb-padded">
        <ErrorAlertFailedRequest />
        <ErrorAlertSiteUnavailable />
        <ErrorAlertSignIn />
        <ErrorAlertSessionExpired />
    </div>
)
