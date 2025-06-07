import {   
    Rate,
    WithdrawRateDocument,
    UndoWithdrawnRateDocument,
    WithdrawRateMutation,
    UndoWithdrawnRateMutation
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql/index'
import { mockRateSubmittedWithQuestions } from './rateDataMock'

const withdrawRateMockSuccess = (
    params: {
        rateID?: string
        rateData?: Partial<Rate>
        updatedReason?: string
    } = {}
): MockedResponse<WithdrawRateMutation> => {
    const {
        rateID = 'test-abc-123',
        rateData,
        updatedReason = 'a valid note',
    } = params
    const rate = mockRateSubmittedWithQuestions({
        __typename: 'Rate',
        id: rateData?.id || rateID,
        parentContractID: rateData?.parentContractID || 'parent-contract-id',
        reviewStatus: 'WITHDRAWN',
        consolidatedStatus: 'WITHDRAWN',
        reviewStatusActions: [
            {
                __typename: 'RateReviewStatusActions',
                actionType: 'WITHDRAW',
                rateID: rateID,
                updatedReason,
                updatedAt: new Date(),
                updatedBy: {
                    __typename: 'UpdatedBy',
                    email: 'cmsapprover@example.com',
                    familyName: 'Smith',
                    givenName: 'John',
                    role: 'CMS_APPROVER_USER',
                },
            },
        ],
    })

    return {
        request: {
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID: rateData?.id || rateID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                withdrawRate: {
                    rate,
                },
            },
        },
    }
}

const undoWithdrawRateMockSuccess = (
    params: {
        rateID?: string
        rateData?: Partial<Rate>
        updatedReason?: string
    } = {}
): MockedResponse<UndoWithdrawnRateMutation> => {
    const {
        rateID = 'test-abc-123',
        rateData,
        updatedReason = 'Undo rate withdraw',
    } = params
    const rate = mockRateSubmittedWithQuestions({
        __typename: 'Rate',
        id: rateData?.id || rateID,
        parentContractID: rateData?.parentContractID || 'parent-contract-id',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'RESUBMITTED',
        reviewStatusActions: [
            {
                __typename: 'RateReviewStatusActions',
                actionType: 'UNDER_REVIEW',
                rateID: rateID,
                updatedReason,
                updatedAt: new Date('2024-5-2'),
                updatedBy: {
                    __typename: 'UpdatedBy',
                    email: 'cmsapprover@example.com',
                    familyName: 'Smith',
                    givenName: 'John',
                    role: 'CMS_APPROVER_USER',
                },
            },
            {
                __typename: 'RateReviewStatusActions',
                actionType: 'WITHDRAW',
                rateID: rateID,
                updatedReason: 'Withdrawing invalid rate',
                updatedAt: new Date('2024-5-1'),
                updatedBy: {
                    __typename: 'UpdatedBy',
                    email: 'cmsapprover@example.com',
                    familyName: 'Smith',
                    givenName: 'John',
                    role: 'CMS_APPROVER_USER',
                },
            },
        ],
    })

    return {
        request: {
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID: rateData?.id || rateID,
                    updatedReason,
                },
            },
        },
        result: {
            data: {
                undoWithdrawRate: {
                    rate,
                },
            },
        },
    }
}

const undoWithdrawRateMockFailure = (): MockedResponse<UndoWithdrawnRateMutation> => {
    const graphQLError = new GraphQLError('Issue undoing a withdrawn rate', {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })

    return {
        request: {
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID: 'test-abc-123',
                    updatedReason: 'Undo withdraw rate'
                },
            },
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const withdrawRateMockFailure = (): MockedResponse<WithdrawRateMutation> => {
    const graphQLError = new GraphQLError('Issue withdrawing rate', {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })
    
    return {
        request: {
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID: 'test-abc-123',
                    updatedReason: 'withdraw rate'
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
    withdrawRateMockFailure,
    withdrawRateMockSuccess,
    undoWithdrawRateMockSuccess,
    undoWithdrawRateMockFailure
}
