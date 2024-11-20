import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    UserAccountWarningBanner,
    AccountWarningBannerProps,
} from './UserAccountWarningBanner'

export default {
    title: 'Components/Banner/UserAccountWarningBanner',
    component: UserAccountWarningBanner,
}

const Template: StoryFn<AccountWarningBannerProps> = ({ header, ...args }) => {
    return <UserAccountWarningBanner />
}

export const Default = Template.bind({})
