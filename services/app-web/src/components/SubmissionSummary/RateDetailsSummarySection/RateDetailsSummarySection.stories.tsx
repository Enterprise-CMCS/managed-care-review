import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import { RateDetailsSummarySectionProps, RateDetailsSummarySection } from '..'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloHelpers'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection',
    component: RateDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'DynamicStepIndicator displays a users progress through a multi-step process. If an invalid route is passed in as the current page, DynamicStepIndicator will render null.',
    },
}

const Template: Story<RateDetailsSummarySectionProps> = (args) => (
    <RateDetailsSummarySection {...args} />
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
