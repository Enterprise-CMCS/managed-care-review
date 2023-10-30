import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    ContractDetailsSummarySectionProps,
    ContractDetailsSummarySection,
} from './ContractDetailsSummarySection'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/ContractDetailsSummarySection',
    component: ContractDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'ContractDetailsSummarySection displays the Contract Details data for a Draft or State Submission',
    },
}

const Template: Story<ContractDetailsSummarySectionProps> = (args) => (
    <ContractDetailsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    editNavigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
}
