import { MockedResponse } from '@apollo/client/testing'
import {
    ApproveContractDocument,
    ApproveContractMutation,
    Contract,
} from '../gen/gqlClient'
import { mockContractPackageSubmittedWithQuestions } from './contractPackageDataMock'

const approveContractMockSuccess = (
    params: {
        contractID?: string
        contractData?: Partial<Contract>
        updatedReason?: string
    } = {}
): MockedResponse<ApproveContractMutation> => {
    const {
        contractID = 'test-abc-123',
        contractData,
        updatedReason = 'Approve contract',
    } = params
    const contract = mockContractPackageSubmittedWithQuestions(contractID, {
        __typename: 'Contract',
        status: 'RESUBMITTED',
        reviewStatus: 'APPROVED',
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
                    updatedReason: updatedReason,
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

export { approveContractMockSuccess }
