import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionV2Props,
    RateDetailsSummarySectionV2,
} from './RateDetailsSummarySectionV2'
import { mockContractAndRatesDraftV2 } from '../../../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection',
    component: RateDetailsSummarySectionV2,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const Template: Story<RateDetailsSummarySectionV2Props> = (args) => (
    <RateDetailsSummarySectionV2 {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
const contract = mockContractAndRatesDraftV2()

WithAction.args = {
    contractId: contract.id,
    draftRates: contract.draftRates,
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: [],
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithoutAction.args = {
    contractId: contract.id,
    draftRates: contract.draftRates,
    submissionName: 'StoryBook',
}
