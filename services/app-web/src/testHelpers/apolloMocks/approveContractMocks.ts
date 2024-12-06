import {MockedResponse} from '@apollo/client/testing';
import {ApproveContractDocument, ApproveContractMutation, Contract} from '../../gen/gqlClient';
import {mockContractPackageSubmittedWithQuestions} from './contractPackageDataMock';
import {ApolloError} from '@apollo/client';
import {GraphQLError} from 'graphql/index';
import {GRAPHQL_ERROR_CAUSE_MESSAGES, GraphQLErrorCauseTypes, GraphQLErrorCodeTypes} from './apolloErrorCodeMocks';

const approveContractMockSuccess = (params: {
    contractID?: string,
    contractData?: Partial<Contract>,
    updatedReason?: string
} = {}): MockedResponse<ApproveContractMutation> => {
    const {
        contractID= 'test-abc-123',
        contractData,
        updatedReason = 'Approve contract'
    } = params
    const contract =
        mockContractPackageSubmittedWithQuestions(
            contractID,
            {
                __typename: 'Contract',
                reviewStatus: 'APPROVED',
                consolidatedStatus: 'APPROVED',
                reviewStatusActions: [
                    {
                        __typename: 'ContractReviewStatusActions',
                        actionType: 'MARK_AS_APPROVED',
                        contractID: contractID,
                        updatedAt: new Date(),
                        updatedBy: {
                            __typename: 'UpdatedBy',
                            email: 'cmsapprover@example.com',
                            familyName: 'Smith',
                            givenName: 'John',
                            role: 'CMS_APPROVER_USER'
                        },
                        updatedReason: 'You are approved'
                    }
                ],
                ...contractData
            }
        )

    return {
        request: {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: 'test-abc-123',
                    updatedReason: updatedReason
                }
            }
        },
        result: {
            data: {
                approveContract: {
                    contract
                }
            }
        }
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
                    updatedReason: 'Released to state'
                }
            }
        },
        error: new ApolloError({
            graphQLErrors: [graphQLError],
        }),
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

export {
    approveContractMockSuccess,
    approveContractMockFailure
}
