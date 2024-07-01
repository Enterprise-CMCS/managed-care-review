import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionV2Props,
    RateDetailsSummarySectionV2,
} from './RateDetailsSummarySectionV2'
import { mockContractPackageDraft } from '../../../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection/V2',
    component: RateDetailsSummarySectionV2,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const Template: StoryFn<RateDetailsSummarySectionV2Props> = (args) => (
    <RateDetailsSummarySectionV2 {...args} />
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
