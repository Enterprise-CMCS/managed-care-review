import React from 'react'
import { Story } from '@storybook/react'
import {
    UserAccountWarningBanner,
    AccountWarningBannerProps,
} from './UserAccountWarningBanner'

export default {
    title: 'Components/Banner/UserAccountWarningBanner',
    component: UserAccountWarningBanner,
}

const Template: Story<AccountWarningBannerProps> = (args) => (
    <UserAccountWarningBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {
    header: 'Missing division',
    message:
        'You must be assigned to a division in order to ask questions about a submission. Contact mc-review@cms.hhs.gov to add your division.',
}
