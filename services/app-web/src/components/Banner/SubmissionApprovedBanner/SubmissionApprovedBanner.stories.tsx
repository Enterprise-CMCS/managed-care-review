import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    SubmissionApprovedBanner,
    ApprovalProps,
} from './SubmissionApprovedBanner'

export default {
    title: 'Components/Banner/SubmissionApprovedBanner',
    component: SubmissionApprovedBanner,
}

const Template: StoryFn<ApprovalProps> = (args) => (
    <SubmissionApprovedBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {
    updatedAt: new Date(),
    updatedBy: {
        email: 'cms-approver@example.com',
        role: 'CMS_USER',
        givenName: 'Bob',
        familyName: 'Vila',
    },
    dateReleasedToState: '2026-03-15',
}
