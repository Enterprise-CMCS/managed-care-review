import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../../../.storybook/providersDecorator'
import {
    SubmissionTypeSummarySectionV2Props,
    SubmissionTypeSummarySectionV2,
} from './SubmissionTypeSummarySectionV2'
import { mockContractPackageDraft } from '../../../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/SubmissionTypeSummarySection/V2',
    component: SubmissionTypeSummarySectionV2,
    parameters: {
        componentSubtitle:
            'SubmissionTypeSummarySection displays the Submission Type data for a Draft or State Submission',
    },
}

const Template: StoryFn<SubmissionTypeSummarySectionV2Props> = (args) => (
    <SubmissionTypeSummarySectionV2 {...args} />
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
