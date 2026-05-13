import { MockLink } from '@apollo/client/testing'
import {
    Contract,
    ReverseUnlockContractDocument,
    ReverseUnlockContractMutation,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/error'

const reverseUnlockContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        updatedReason?: string
    } = {}
): MockLink.MockedResponse<ReverseUnlockContractMutation> => {
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
            query: ReverseUnlockContractDocument,
            variables: {
                input: {
                    contractID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                reverseUnlockContract: {
                    contract,
                },
            },
        },
    }
}

const reverseUnlockContractMockFailure =
    (): MockLink.MockedResponse<ReverseUnlockContractMutation> => {
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
                query: ReverseUnlockContractDocument,
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
    reverseUnlockContractMockSuccess,
    reverseUnlockContractMockFailure,
}
