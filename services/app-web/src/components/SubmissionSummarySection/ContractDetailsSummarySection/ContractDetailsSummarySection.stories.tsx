import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    ContractDetailsSummarySectionProps,
    ContractDetailsSummarySection,
} from './ContractDetailsSummarySection'
import { mockContractAndRatesDraft } from '@mc-review/mocks'

export default {
    title: 'Components/SubmissionSummary/ContractDetailsSummarySection',
    component: ContractDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'ContractDetailsSummarySection displays the Contract Details data for a Draft or State Submission',
    },
}

const Template: StoryFn<ContractDetailsSummarySectionProps> = (args) => (
    <ContractDetailsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    editNavigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
}
