import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    PreviousSubmissionBanner,
    UnlockedProps,
} from './PreviousSubmissionBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/PreviousSubmissionBanner',
    component: PreviousSubmissionBanner,
}

const Template: StoryFn<UnlockedProps> = (args) => (
    <PreviousSubmissionBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {
    link: '/submissions/abc-123',
}
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
