import React from 'react'
import { StoryFn } from '@storybook/react'
import { EqroReviewDeterminationBanners } from './eqroSummaryBanners'

export default {
    title: 'Components/Banner/EqroReviewDeterminationBanners',
    component: EqroReviewDeterminationBanners,
}

const Template: StoryFn<
    React.ComponentProps<typeof EqroReviewDeterminationBanners>
> = (args) => <EqroReviewDeterminationBanners {...args} />

export const StateUserSubjectToReview = Template.bind({})
StateUserSubjectToReview.args = {
    subjectToReview: true,
    stateUser: true,
}

export const StateUserNotSubjectToReview = Template.bind({})
StateUserNotSubjectToReview.args = {
    subjectToReview: false,
    stateUser: true,
}

export const CMSUserSubjectToReview = Template.bind({})
CMSUserSubjectToReview.args = {
    subjectToReview: true,
    stateUser: false,
}

export const CMSUserNotSubjectToReview = Template.bind({})
CMSUserNotSubjectToReview.args = {
    subjectToReview: false,
    stateUser: false,
}

const updateInfo = {
    updatedAt: new Date('2026-03-15'),
    updatedReason:
        'Updated rate certification and contract amendment documents to reflect revised capitation rates for SFY 2026.',
    updatedBy: {
        email: 'stateuser@example.com',
        role: 'STATE_USER',
        givenName: 'Jane',
        familyName: 'Smith',
    },
}

export const ResubmittedStateUserSubjectToReview = Template.bind({})
ResubmittedStateUserSubjectToReview.args = {
    subjectToReview: true,
    stateUser: true,
    updateInfo,
}

export const ResubmittedStateUserNotSubjectToReview = Template.bind({})
ResubmittedStateUserNotSubjectToReview.args = {
    subjectToReview: false,
    stateUser: true,
    updateInfo,
}

export const ResubmittedCMSUserSubjectToReview = Template.bind({})
ResubmittedCMSUserSubjectToReview.args = {
    subjectToReview: true,
    stateUser: false,
    updateInfo,
}

export const ResubmittedCMSUserNotSubjectToReview = Template.bind({})
ResubmittedCMSUserNotSubjectToReview.args = {
    subjectToReview: false,
    stateUser: false,
    updateInfo,
}
