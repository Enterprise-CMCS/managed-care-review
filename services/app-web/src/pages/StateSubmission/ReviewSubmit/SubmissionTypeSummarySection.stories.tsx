import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    SubmissionTypeSummarySectionProps,
    SubmissionTypeSummarySection,
} from './SubmissionTypeSummarySection'
import { mockContractPackageDraft } from '@mc-review/mocks'

export default {
    title: 'Components/SubmissionSummary/SubmissionTypeSummarySection/V2',
    component: SubmissionTypeSummarySection,
    parameters: {
        componentSubtitle:
            'SubmissionTypeSummarySection displays the Submission Type data for a Draft or State Submission',
    },
}

const Template: StoryFn<SubmissionTypeSummarySectionProps> = (args) => (
    <SubmissionTypeSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithAction.args = {
    contract: mockContractPackageDraft(),
    //TODO: Use better mock program data
    statePrograms: [],
    editNavigateTo: 'submission-type',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

WithoutAction.args = {
    contract: mockContractPackageDraft(),
    statePrograms: [],
}
