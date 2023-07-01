import React from 'react'
import { Story } from '@storybook/react'
import {
    UserAccountWarningBanner,
    AccountWarningBannerProps,
} from './UserAccountWarningBanner'
import { useStringConstants } from '../../../hooks/useStringConstants'

export default {
    title: 'Components/Banner/UserAccountWarningBanner',
    component: UserAccountWarningBanner,
}

const Template: Story<AccountWarningBannerProps> = ({ header, ...args }) => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT

    return (
        <UserAccountWarningBanner
            {...args}
            header={header}
            message={`You must be assigned to a division in order to ask questions about a submission. Contact ${MAIL_TO_SUPPORT} to add your division.`}
        />
    )
}

export const Default = Template.bind({})
Default.args = {
    header: 'Missing division',
}
