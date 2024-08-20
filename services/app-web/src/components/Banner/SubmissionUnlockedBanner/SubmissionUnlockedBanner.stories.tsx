import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    SubmissionUnlockedBanner,
    UnlockedProps,
} from './SubmissionUnlockedBanner'
import { mockValidStateUser } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/Banner/SubmissionUnlockedBanner',
    component: SubmissionUnlockedBanner,
}

const Template: StoryFn<UnlockedProps> = (args) => (
    <SubmissionUnlockedBanner {...args} />
)

export const SubmissionUnlockedBannerCMSUser = Template.bind({})
SubmissionUnlockedBannerCMSUser.args = {
    loggedInUser: mockValidStateUser(),
    unlockedInfo: {
        updatedAt: new Date(),
        updatedReason:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.',
        updatedBy: {
            email: 'Loremipsum@email.com',
            role: 'CMS_USER',
            givenName: 'Bob',
            familyName: 'Vila',
        },
    },
}

export const SubmissionUnlockedBannerStateUser = Template.bind({})
SubmissionUnlockedBannerStateUser.args = {
    loggedInUser: mockValidStateUser(),
    unlockedInfo: {
        updatedAt: new Date(),
        updatedReason:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.',

        updatedBy: {
            email: 'Loremipsum@email.com',
            role: 'CMS_USER',
            givenName: 'Bob',
            familyName: 'Vila',
        },
    },
}
