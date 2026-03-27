import React from 'react'
import { StoryFn } from '@storybook/react'
import { RateWithdrawBanner, WithdrawProps } from './RateWithdrawBanner'

export default {
    title: 'Components/Banner/RateWithdrawBanner',
    component: RateWithdrawBanner,
}

const Template: StoryFn<WithdrawProps> = (args) => (
    <RateWithdrawBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {
    updatedAt: new Date(),
    updatedBy: {
        email: 'cms-user@example.com',
        role: 'CMS_USER',
        givenName: 'Jane',
        familyName: 'Smith',
    },
    reasonForWithdraw:
        'Rate certification was submitted in error and needs to be corrected before resubmission.',
}
