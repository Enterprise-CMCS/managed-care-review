import { MockLink } from '@apollo/client/testing'
import {
    Contract,
    ReverseApproveContractDocument,
    ReverseApproveContractMutation,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/error'

const reverseApproveContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        updatedReason?: string
    } = {}
): MockLink.MockedResponse<ReverseApproveContractMutation> => {
    const {
        contractID = 'test-abc-123',
        contractData,
        updatedReason = 'Undo submission approval',
    } = params

    const contract = mockContractPackageSubmittedWithQuestions(
        contractData?.id || contractID,
        {
            __typename: 'Contract',
            contractSubmissionType:
                contractData?.contractSubmissionType ?? 'HEALTH_PLAN',
            reviewStatus: contractData?.reviewStatus ?? 'UNDER_REVIEW',
            consolidatedStatus: contractData?.consolidatedStatus ?? 'SUBMITTED',
            status: contractData?.status ?? 'SUBMITTED',
        }
    )

    return {
        request: {
            query: ReverseApproveContractDocument,
            variables: {
                input: {
                    contractID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                reverseApproveContract: {
                    contract,
                },
            },
        },
    }
}

const reverseApproveContractMockFailure =
    (): MockLink.MockedResponse<ReverseApproveContractMutation> => {
        const graphQLError = new GraphQLError(
            'Issue undoing submission approval',
            {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            }
        )

        return {
            request: {
                query: ReverseApproveContractDocument,
                variables: {
                    input: {
                        contractID: 'test-abc-123',
                        updatedReason: 'undo reason',
                    },
                },
            },
            result: {
                data: null,
                errors: [graphQLError],
            },
        }
    }

export { reverseApproveContractMockSuccess, reverseApproveContractMockFailure }
