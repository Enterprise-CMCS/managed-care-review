import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionProps,
    RateDetailsSummarySection,
} from './RateDetailsSummarySection'
import { mockContractPackageDraft } from '@mc-review/mocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection/V2',
    component: RateDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const Template: StoryFn<RateDetailsSummarySectionProps> = (args) => (
    <RateDetailsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
const contract = mockContractPackageDraft()

WithAction.args = {
    contract: contract,
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: [],
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
WithoutAction.args = {
    contract: contract,
    submissionName: 'StoryBook',
}
