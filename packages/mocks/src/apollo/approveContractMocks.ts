import { MockedResponse } from '@apollo/client/testing'
import {
    ApproveContractDocument,
    ApproveContractMutation,
    Contract,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/index'
import {
    GRAPHQL_ERROR_CAUSE_MESSAGES,
    GraphQLErrorCauseTypes,
    GraphQLErrorCodeTypes,
} from './apolloErrorCodeMocks'
import { formatUserInputDate } from '@mc-review/dates'

const approveContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        dateApprovalReleasedToState?: string
    } = {}
): MockedResponse<ApproveContractMutation> => {
    const {
        contractID = 'test-abc-123',
        contractData,
        dateApprovalReleasedToState = '10/10/2024',
    } = params
    const contract = mockContractPackageSubmittedWithQuestions(contractID, {
        __typename: 'Contract',
        reviewStatus: 'APPROVED',
        consolidatedStatus: 'APPROVED',
        reviewStatusActions: [
            {
                __typename: 'ContractReviewStatusActions',
                actionType: 'MARK_AS_APPROVED',
                contractID: contractID,
                dateApprovalReleasedToState,
                updatedAt: new Date(),
                updatedBy: {
                    __typename: 'UpdatedBy',
                    email: 'cmsapprover@example.com',
                    familyName: 'Smith',
                    givenName: 'John',
                    role: 'CMS_APPROVER_USER',
                },
                updatedReason: 'You are approved',
            },
        ],
        ...contractData,
    })

    return {
        request: {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: 'test-abc-123',
                    dateApprovalReleasedToState,
                },
            },
        },
        result: {
            data: {
                approveContract: {
                    contract,
                },
            },
        },
    }
}

const approveContractMockFailure = ({
    error,
}: {
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<ApproveContractMutation> => {
    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to mark submission as released to state',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )
    return {
        request: {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: 'test-abc-123',
                    dateApprovalReleasedToState:
                        formatUserInputDate('12/12/2024'),
                },
            },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

export { approveContractMockSuccess, approveContractMockFailure }
