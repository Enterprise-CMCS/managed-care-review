import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    SubmissionTypeSummarySectionProps,
    SubmissionTypeSummarySection,
} from './SubmissionTypeSummarySection'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/SubmissionTypeSummarySection',
    component: SubmissionTypeSummarySection,
    parameters: {
        componentSubtitle:
            'SubmissionTypeSummarySection displays the Submission Type data for a Draft or State Submission',
    },
}

const Template: Story<SubmissionTypeSummarySectionProps> = (args) => (
    <SubmissionTypeSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    //TODO: Use better mock program data
    statePrograms: [],
    editNavigateTo: 'submission-type',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
    statePrograms: [],
}
