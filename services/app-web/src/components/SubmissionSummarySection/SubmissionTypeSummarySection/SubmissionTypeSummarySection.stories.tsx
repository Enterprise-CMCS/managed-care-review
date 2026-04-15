import { StoryFn } from '@storybook/react'
import { GridContainer } from '@trussworks/react-uswds'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    SubmissionTypeSummarySectionProps,
    SubmissionTypeSummarySection,
} from './SubmissionTypeSummarySection'
import {
    fetchCurrentUserMock,
    mockContractFormData,
    mockContractPackageDraft,
    mockStateData,
    mockValidStateUser,
} from '@mc-review/mocks'
import { packageName } from '@mc-review/submissions'

export default {
    title: 'Components/SubmissionSummary/SubmissionTypeSummarySection',
    component: SubmissionTypeSummarySection,
    parameters: {
        componentSubtitle:
            'SubmissionTypeSummarySection displays the Submission Type data for a Draft or State Submission',
    },
}
const kyStateMock = mockStateData('KY')
const draft = mockContractPackageDraft({
    stateCode: 'KY',
    state: kyStateMock,
    draftRevision: {
        __typename: 'ContractRevision',
        submitInfo: null,
        unlockInfo: null,
        id: '123',
        contractID: 'test-abc-123',
        createdAt: new Date('01/01/2023'),
        updatedAt: new Date('11/01/2023'),
        contractName: packageName(
            'KY',
            5,
            kyStateMock.programs.map((p) => p.id),
            kyStateMock.programs
        ),
        documentZipPackages: [],
        formData: mockContractFormData({
            programIDs: kyStateMock.programs.map((p) => p.id),
        }),
    },
})

const stateUserWithDeprecatedProgram = mockValidStateUser({
    state: kyStateMock,
})

const Template: StoryFn<SubmissionTypeSummarySectionProps> = (args) => (
    <GridContainer className="margin-top-1">
        <SubmissionTypeSummarySection {...args} />
    </GridContainer>
)

export const WithAction = Template.bind({})
WithAction.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: stateUserWithDeprecatedProgram,
                        statusCode: 200,
                    }),
                ],
            },
        }),
]

WithAction.args = {
    contract: draft,
    submissionName: draft.draftRevision!.contractName,
    isStateUser: true,
    editNavigateTo: 'submission-type',
}

export const WithoutAction = Template.bind({})
WithoutAction.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: stateUserWithDeprecatedProgram,
                        statusCode: 200,
                    }),
                ],
            },
        }),
]

WithoutAction.args = {
    contract: draft,
    submissionName: draft.draftRevision!.contractName,
    isStateUser: true,
}
