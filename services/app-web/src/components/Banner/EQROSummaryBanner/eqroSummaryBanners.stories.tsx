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
