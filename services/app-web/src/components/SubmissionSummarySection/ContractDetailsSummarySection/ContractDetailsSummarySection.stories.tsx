import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import {
    ContractDetailsSummarySectionProps,
    ContractDetailsSummarySection,
} from './ContractDetailsSummarySection'
import {
    fetchCurrentUserMock,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockValidStateUser,
} from '@mc-review/mocks'
import { GridContainer } from '@trussworks/react-uswds'

export default {
    title: 'Components/SubmissionSummary/ContractDetailsSummarySection',
    component: ContractDetailsSummarySection,
    parameters: {
        componentSubtitle:
            'ContractDetailsSummarySection displays the Contract Details data for a Draft or State Submission',
    },
}

const Template: StoryFn<ContractDetailsSummarySectionProps> = (args) => (
    <GridContainer className="margin-top-1">
        <ContractDetailsSummarySection {...args} />
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
    contract: mockContractPackageDraft(),
    editNavigateTo: 'contract-details',
    isStateUser: true,
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
    contract: mockContractPackageSubmitted(),
    isStateUser: true,
    onDocumentError: () => {},
    explainMissingData: false,
}
