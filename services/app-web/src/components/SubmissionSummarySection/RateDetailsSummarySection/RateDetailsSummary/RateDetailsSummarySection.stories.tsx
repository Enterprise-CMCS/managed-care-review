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
    mockStateData,
    mockValidStateUser,
    rateRevisionDataMock,
} from '@mc-review/mocks'

export default {
    title: 'Components/SubmissionSummary/RateDetailsSummarySection',
    component: RateDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'RateDetailsSummarySection displays the Rate Details data for a Draft or State Submission',
    },
}

const kyStateMock = mockStateData('KY')

const fetchKyUserMock = () =>
    fetchCurrentUserMock({
        user: mockValidStateUser({ state: kyStateMock }),
        statusCode: 200,
    })

const draft = mockContractPackageDraft({
    stateCode: 'MN',
    state: kyStateMock,
    draftRates: [
        draftRateDataMock({
            initiallySubmittedAt: null,
            stateCode: 'KY',
            parentContractID: 'test-abc-123',
            draftRevision: {
                ...rateRevisionDataMock({
                    submitInfo: null,
                    formData: {
                        ...rateRevisionDataMock().formData,
                        rateProgramIDs: kyStateMock.programs.map((p) => p.id),
                    },
                }),
            },
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
                mocks: [fetchKyUserMock()],
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
                mocks: [fetchKyUserMock()],
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
