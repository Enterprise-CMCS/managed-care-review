import React from 'react'
import { StoryFn } from '@storybook/react'
import { StatusUpdatedBanner } from './StatusUpdatedBanner'

export default {
    title: 'Components/Banner/StatusUpdatedBanner',
    component: StatusUpdatedBanner,
}

const Template: StoryFn = () => <StatusUpdatedBanner />

export const Default = Template.bind({})
