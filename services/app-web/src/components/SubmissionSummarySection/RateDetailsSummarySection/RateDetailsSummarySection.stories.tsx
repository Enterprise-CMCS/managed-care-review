import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionProps,
    RateDetailsSummarySection,
} from './RateDetailsSummarySection'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection',
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

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: [],
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
    submissionName: 'StoryBook',
}
