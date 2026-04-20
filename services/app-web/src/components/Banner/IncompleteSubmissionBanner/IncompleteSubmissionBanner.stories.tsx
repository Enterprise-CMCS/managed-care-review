import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    IncompleteSubmissionBanner,
    IncompleteSubmissionProps,
} from './IncompleteSubmissionBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/IncompleteSubmissionBanner',
    component: IncompleteSubmissionBanner,
}

const Template: StoryFn<IncompleteSubmissionProps> = (args) => (
    <IncompleteSubmissionBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {}
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const CustomHeadingAndMessage = Template.bind({})
CustomHeadingAndMessage.args = {
    heading: 'Missing required fields',
    message: 'Please fill out all required fields before submitting.',
}
CustomHeadingAndMessage.decorators = [
    (StoryFn) => ProvidersDecorator(StoryFn, {}),
]
