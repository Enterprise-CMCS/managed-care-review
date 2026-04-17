import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    ContactsSummarySectionProps,
    ContactsSummarySection,
} from './ContactsSummarySection'
import {
    fetchCurrentUserMock,
    mockContractFormData,
    mockContractPackageDraft,
    mockValidStateUser,
} from '@mc-review/mocks'
import { GridContainer } from '@trussworks/react-uswds'

export default {
    title: 'Components/SubmissionSummary/ContactsSummarySection',
    component: ContactsSummarySection,
    parameters: {
        componentSubtitle:
            'ContactsSummarySection displays the Contacts data for a Draft or State Submission',
    },
}

const draft = mockContractPackageDraft({
    draftRevision: {
        __typename: 'ContractRevision',
        submitInfo: null,
        unlockInfo: null,
        id: '123',
        contractID: 'test-abc-123',
        createdAt: new Date('01/01/2023'),
        updatedAt: new Date('11/01/2023'),
        contractName: 'MCR-0005-alvhalfhdsalfee',
        documentZipPackages: [],
        formData: mockContractFormData({
            stateContacts: [
                {
                    __typename: 'StateContact',
                    name: 'State Contact 1',
                    titleRole: 'Test State Contact 1',
                    email: 'statecontact1@test.com',
                },
                {
                    __typename: 'StateContact',
                    name: 'State Contact 2',
                    titleRole: 'Test State Contact 2',
                    email: 'statecontact2@test.com',
                },
                {
                    __typename: 'StateContact',
                    name: 'State Contact 3',
                    titleRole: 'Test State Contact 3',
                    email: 'statecontact3@test.com',
                },
                {
                    __typename: 'StateContact',
                    name: 'State Contact 4',
                    titleRole: 'Test State Contact 4',
                    email: 'statecontact4@test.com',
                },
            ],
        }),
    },
})

const Template: StoryFn<ContactsSummarySectionProps> = (args) => (
    <GridContainer className="margin-top-1">
        <ContactsSummarySection {...args} />
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
    isStateUser: true,
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
    contract: draft,
    isStateUser: true,
}
