import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../../.storybook/providersDecorator'

import { SubmissionSummaryCardProps } from '../SubmissionSummaryCard'
import { SubmissionTypeSummaryCard } from '..'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloHelpers'

export default {
    title: 'Components/SubmissionSummaryCard/SubmissionTypeSummaryCard',
    component: SubmissionTypeSummaryCard,
    parameters: {
        componentSubtitle:
            'DynamicStepIndicator displays a users progress through a multi-step process. If an invalid route is passed in as the current page, DynamicStepIndicator will render null.',
    },
}

const Template: Story<SubmissionSummaryCardProps> = (args) => (
    <SubmissionTypeSummaryCard {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    navigateTo: 'submission-type',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
}
