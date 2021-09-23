import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../../.storybook/providersDecorator'

import { SubmissionSummaryCardProps } from '../SubmissionSummaryCard'
import { ContactsSummaryCard } from '..'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloHelpers'

export default {
    title: 'Components/SubmissionSummaryCard/ContactsSummaryCard',
    component: ContactsSummaryCard,
    parameters: {
        componentSubtitle:
            'DynamicStepIndicator displays a users progress through a multi-step process. If an invalid route is passed in as the current page, DynamicStepIndicator will render null.',
    },
}

const Template: Story<SubmissionSummaryCardProps> = (args) => (
    <ContactsSummaryCard {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    navigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
}
