import { MockLink } from '@apollo/client/testing'
import {
    Contract,
    UndoUnlockContractDocument,
    UndoUnlockContractMutation,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/error'

const undoUnlockContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        updatedReason?: string
    } = {}
): MockLink.MockedResponse<UndoUnlockContractMutation> => {
    const {
        contractID = 'test-abc-123',
        contractData,
        updatedReason = 'Undo submission unlock',
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
            query: UndoUnlockContractDocument,
            variables: {
                input: {
                    contractID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                undoUnlockContract: {
                    contract,
                },
            },
        },
    }
}

const undoUnlockContractMockFailure =
    (): MockLink.MockedResponse<UndoUnlockContractMutation> => {
        const graphQLError = new GraphQLError(
            'Issue undoing submission unlock',
            {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            }
        )

        return {
            request: {
                query: UndoUnlockContractDocument,
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

export {
    undoUnlockContractMockSuccess,
    undoUnlockContractMockFailure,
}
