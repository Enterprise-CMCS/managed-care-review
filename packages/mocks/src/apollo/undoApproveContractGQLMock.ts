import { MockLink } from '@apollo/client/testing'
import {
    Contract,
    UndoApproveContractDocument,
    UndoApproveContractMutation,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/error'

const undoApproveContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        updatedReason?: string
    } = {}
): MockLink.MockedResponse<UndoApproveContractMutation> => {
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
            query: UndoApproveContractDocument,
            variables: {
                input: {
                    contractID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                undoApproveContract: {
                    contract,
                },
            },
        },
    }
}

const undoApproveContractMockFailure =
    (): MockLink.MockedResponse<UndoApproveContractMutation> => {
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
                query: UndoApproveContractDocument,
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

export { undoApproveContractMockSuccess, undoApproveContractMockFailure }
