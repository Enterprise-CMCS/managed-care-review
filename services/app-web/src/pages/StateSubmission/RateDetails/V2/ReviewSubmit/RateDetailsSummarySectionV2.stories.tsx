import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionV2Props,
    RateDetailsSummarySectionV2,
} from './RateDetailsSummarySectionV2'
import { mockContractAndRatesDraftV2 } from '../../../../../testHelpers/apolloMocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection/V2',
    component: RateDetailsSummarySectionV2,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const Template: Story<RateDetailsSummarySectionV2Props> = (args) => (
    <RateDetailsSummarySectionV2 {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
const contract = mockContractAndRatesDraftV2()

WithAction.args = {
    contract: contract,
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: [],
    documentDateLookupTable: {
        fakesha: 'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        previousSubmissionDate: '01/01/01'
    },
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithoutAction.args = {
    contract: contract,
    submissionName: 'StoryBook',
    documentDateLookupTable: {
        fakesha: 'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        previousSubmissionDate: '01/01/01'
    },
}
