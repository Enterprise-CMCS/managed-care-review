import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    SubmissionUpdatedBanner,
    UpdatedProps,
} from './SubmissionUpdatedBanner'

export default {
    title: 'Components/Banner/SubmissionUpdatedBanner',
    component: SubmissionUpdatedBanner,
}

const Template: StoryFn<UpdatedProps> = (args) => (
    <SubmissionUpdatedBanner {...args} />
)

export const SubmissionUpdatedBannerLongText = Template.bind({})
SubmissionUpdatedBannerLongText.args = {
    submittedBy: 'Loremipsum@email.com',
    updatedOn: new Date(),
    changesMade:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.',
}

export const SubmissionUpdatedBannerShortText = Template.bind({})
SubmissionUpdatedBannerShortText.args = {
    submittedBy: 'Loremipsum@email.com',
    updatedOn: new Date(),
    changesMade:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur.',
}
