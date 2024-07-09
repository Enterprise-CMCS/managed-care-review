import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionProps,
    RateDetailsSummarySection,
} from './RateDetailsSummarySection'
import { mockContractPackageDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection/V2',
    component: RateDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const Template: Story<RateDetailsSummarySectionProps> = (args) => (
    <RateDetailsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
const contract = mockContractPackageDraft()

WithAction.args = {
    contract: contract,
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: [],
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithoutAction.args = {
    contract: contract,
    submissionName: 'StoryBook',
}
