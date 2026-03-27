import React from 'react'
import { StoryFn } from '@storybook/react'
import { SubmissionWithdrawWarningBanner } from './SubmissionWithdrawWarningBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/SubmissionWithdrawWarningBanner',
    component: SubmissionWithdrawWarningBanner,
}

const Template: StoryFn<
    React.ComponentProps<typeof SubmissionWithdrawWarningBanner>
> = (args) => <SubmissionWithdrawWarningBanner {...args} />

export const SingleRate = Template.bind({})
SingleRate.args = {
    rates: [{ rateName: 'Rate Cert ABC-123', rateURL: '/rates/abc-123' }],
}
SingleRate.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const MultipleRates = Template.bind({})
MultipleRates.args = {
    rates: [
        { rateName: 'Rate Cert ABC-123', rateURL: '/rates/abc-123' },
        { rateName: 'Rate Cert DEF-456', rateURL: '/rates/def-456' },
        { rateName: 'Rate Cert GHI-789', rateURL: '/rates/ghi-789' },
    ],
}
MultipleRates.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
