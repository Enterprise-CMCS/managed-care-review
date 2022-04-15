import React from 'react'
import { Story } from '@storybook/react'
import {
    SubmissionUpdatedBanner,
    UpdatedProps,
} from './SubmissionUpdatedBanner'

export default {
    title: 'Components/Banner/SubmissionUpdatedBanner',
    component: SubmissionUpdatedBanner,
}

const Template: Story<UpdatedProps> = (args) => (
    <SubmissionUpdatedBanner {...args} />
)

export const SubmissionUnlockedBannerLongText = Template.bind({})
SubmissionUnlockedBannerLongText.args = {
    submittedBy: 'Loremipsum@email.com',
    updatedOn: new Date(),
    changesMade:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.',
}

export const SubmissionUnlockedBannerShortText = Template.bind({})
SubmissionUnlockedBannerShortText.args = {
    submittedBy: 'Loremipsum@email.com',
    updatedOn: new Date(),
    changesMade:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur.',
}
