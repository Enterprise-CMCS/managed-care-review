import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../../../.storybook/providersDecorator'
import {
    ContractDetailsSummarySectionV2Props,
    ContractDetailsSummarySectionV2 as ContractDetailsSummarySection,
} from './ContractDetailsSummarySectionV2'
import { mockContractAndRatesDraftV2 } from '../../../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/ContractDetailsSummarySection/V2',
    component: ContractDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'ContractDetailsSummarySection displays the Contract Details data for a Draft or State Submission',
    },
}

const Template: Story<ContractDetailsSummarySectionV2Props> = (args) => (
    <ContractDetailsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    contract: mockContractAndRatesDraftV2(),
    editNavigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    contract: mockContractAndRatesDraftV2(),
}
