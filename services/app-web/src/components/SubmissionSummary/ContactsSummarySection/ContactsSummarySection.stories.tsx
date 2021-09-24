import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import { ContactsSummarySectionProps, ContactsSummarySection } from '..'
import { mockContractAndRatesDraft } from '../../../testHelpers/apolloHelpers'

export default {
    title: 'Components/SubmissionSummary/ContactsSummarySection',
    component: ContactsSummarySection,
    parameters: {
        componentSubtitle:
            'ContactsSummarySection displays the Contacts data for a Draft or State Submission',
    },
}

const Template: Story<ContactsSummarySectionProps> = (args) => (
    <ContactsSummarySection {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    submission: mockContractAndRatesDraft(),
    navigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    submission: mockContractAndRatesDraft(),
}
