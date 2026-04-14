import { StoryFn } from '@storybook/react'
import { GridContainer } from '@trussworks/react-uswds'
import ProvidersDecorator from '../../../../../.storybook/providersDecorator'
import {
    RateDetailsSummarySectionProps,
    RateDetailsSummarySection,
} from './RateDetailsSummarySection'
import {
    draftRateDataMock,
    fetchCurrentUserMock,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockValidStateUser,
} from '@mc-review/mocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection',
    component: RateDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const draft = mockContractPackageDraft({
    draftRates: [
        draftRateDataMock({
            initiallySubmittedAt: null,
            parentContractID: 'test-abc-123',
        }),
    ],
})
const submitted = mockContractPackageSubmitted()

const Template: StoryFn<RateDetailsSummarySectionProps> = (args) => (
    <GridContainer className="margin-top-1">
        <RateDetailsSummarySection {...args} />
    </GridContainer>
)

export const WithAction = Template.bind({})
WithAction.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidStateUser(),
                        statusCode: 200,
                    }),
                ],
            },
        }),
]

WithAction.args = {
    contract: draft,
    editNavigateTo: 'contract-details',
    submissionName: 'StoryBook',
    statePrograms: draft.state.programs,
    isCMSUser: false,
    onDocumentError: () => {},
    explainMissingData: false,
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidStateUser(),
                        statusCode: 200,
                    }),
                ],
            },
        }),
]

WithoutAction.args = {
    contract: submitted,
    submissionName: 'StoryBook',
    statePrograms: submitted.state.programs,
    isCMSUser: false,
    onDocumentError: () => {},
    explainMissingData: false,
}
