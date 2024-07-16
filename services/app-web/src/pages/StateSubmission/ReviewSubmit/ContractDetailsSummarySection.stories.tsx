import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    ContractDetailsSummarySectionProps,
    ContractDetailsSummarySection,
} from './ContractDetailsSummarySection'
import { mockContractPackageDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/ContractDetailsSummarySection/V2',
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
    contract: mockContractPackageDraft(),
    editNavigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithoutAction.args = {
    contract: mockContractPackageDraft(),
}
