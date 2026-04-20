import React from 'react'
import { StoryFn } from '@storybook/react'
import { SubmissionWithdrawnBanner } from './SubmissionWithdrawnBanner'

export default {
    title: 'Components/Banner/SubmissionWithdrawnBanner',
    component: SubmissionWithdrawnBanner,
}

const Template: StoryFn<
    React.ComponentProps<typeof SubmissionWithdrawnBanner>
> = (args) => <SubmissionWithdrawnBanner {...args} />

export const Default = Template.bind({})
Default.args = {
    withdrawInfo: {
        updatedAt: new Date(),
        updatedBy: {
            email: 'cms-user@example.com',
            role: 'CMS_USER',
            givenName: 'Jane',
            familyName: 'Smith',
        },
        updatedReason:
            'Submission was withdrawn because the contract terms need to be renegotiated with the managed care organization.',
    },
}
