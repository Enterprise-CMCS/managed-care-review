import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    SubmissionTypeSummarySectionProps,
    SubmissionTypeSummarySection,
} from './SubmissionTypeSummarySection'
import { mockContractPackageDraft } from '../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/SubmissionTypeSummarySection/V2',
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
    contract: mockContractPackageDraft(),
    //TODO: Use better mock program data
    statePrograms: [],
    editNavigateTo: 'submission-type',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    contract: mockContractPackageDraft(),
    statePrograms: [],
}
