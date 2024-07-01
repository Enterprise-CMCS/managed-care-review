import React from 'react'
import { StoryFn } from '@storybook/react'
import { QuestionResponseSubmitBanner } from './QuestionResponseSubmitBanner'
import type { QuestionResponseSubmitBannerProps } from './QuestionResponseSubmitBanner'

export default {
    title: 'Components/Banner/QuestionResponseBanner',
    component: QuestionResponseSubmitBanner,
}

const Template: StoryFn<QuestionResponseSubmitBannerProps> = (args) => (
    <QuestionResponseSubmitBanner {...args} />
)

export const QuestionResponseSubmitBannerCMSUser = Template.bind({})
QuestionResponseSubmitBannerCMSUser.args = {
    submitType: 'question',
}

export const QuestionResponseSubmitBannerStateUser = Template.bind({})
QuestionResponseSubmitBannerStateUser.args = {
    submitType: 'response',
}
