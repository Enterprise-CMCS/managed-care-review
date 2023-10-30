import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { SectionHeaderProps, SectionHeader } from './SectionHeader'

export default {
    title: 'Components/SectionHeader',
    component: SectionHeader,
    parameters: {
        componentSubtitle:
            'SubmissionTypeSummarySection displays the Submission Type data for a Draft or State Submission',
    },
}

const Template: Story<SectionHeaderProps> = (args) => (
    <SectionHeader {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    header: 'Contract details',
    editNavigateTo: 'contract-details',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithoutAction.args = {
    header: 'Contract details',
}
