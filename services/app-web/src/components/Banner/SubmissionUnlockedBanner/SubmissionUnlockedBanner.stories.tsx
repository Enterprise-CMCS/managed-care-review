import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    SubmissionUnlockedBanner,
    UnlockedProps,
} from './SubmissionUnlockedBanner'

export default {
    title: 'Components/Banner/SubmissionUnlockedBanner',
    component: SubmissionUnlockedBanner,
}

const Template: StoryFn<UnlockedProps> = (args) => (
    <SubmissionUnlockedBanner {...args} />
)

export const SubmissionUnlockedBannerCMSUser = Template.bind({})
SubmissionUnlockedBannerCMSUser.args = {
    userType: 'CMS_USER',
    unlockedBy: 'Loremipsum@email.com',
    unlockedOn: new Date(),
    reason: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.',
}

export const SubmissionUnlockedBannerStateUser = Template.bind({})
SubmissionUnlockedBannerStateUser.args = {
    userType: 'STATE_USER',
    unlockedBy: 'Loremipsum@email.com',
    unlockedOn: new Date(),
    reason: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.',
}
