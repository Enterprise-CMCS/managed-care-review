import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    SubmissionUpdatedBanner,
    UpdatedProps,
} from './SubmissionUpdatedBanner'
import { mockValidStateUser } from '@mc-review/mocks'

export default {
    title: 'Components/Banner/SubmissionUpdatedBanner',
    component: SubmissionUpdatedBanner,
}

const Template: StoryFn<UpdatedProps> = (args) => (
    <SubmissionUpdatedBanner {...args} />
)

export const SubmissionUpdatedBannerLongText = Template.bind({})
SubmissionUpdatedBannerLongText.args = {
    loggedInUser: mockValidStateUser(),
    updateInfo: {
        updatedAt: new Date(),
        updatedReason:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.',
        updatedBy: {
            email: 'Loremipsum@email.com',
            role: 'STATE_USER',
            givenName: 'Bob',
            familyName: 'Vila',
        },
    },
}

export const SubmissionUpdatedBannerShortText = Template.bind({})
SubmissionUpdatedBannerShortText.args = {
    loggedInUser: mockValidStateUser(),
    updateInfo: {
        updatedAt: new Date(),
        updatedReason:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur.',
        updatedBy: {
            email: 'Loremipsum@email.com',
            role: 'STATE_USER',
            givenName: 'Bob',
            familyName: 'Vila',
        },
    },
}
