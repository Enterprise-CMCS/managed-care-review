import { MockedResponse } from '@apollo/client/testing'
import {
    WithdrawAndReplaceRedundantRateMutation,
    WithdrawAndReplaceRedundantRateDocument,
    Contract,
} from '../gen/gqlClient'
import { mockContractPackageSubmitted } from './contractPackageDataMock'

export const withdrawAndReplaceRedundantRateMock = ({
    contract,
    input,
}: {
    contract: Partial<Contract>
    input: {
        replacementRateID: string
        replaceReason: string
        withdrawnRateID: string
        contractID: string
    }
}): MockedResponse<WithdrawAndReplaceRedundantRateMutation> => {
    const mockContract = mockContractPackageSubmitted(contract)
    return {
        request: {
            query: WithdrawAndReplaceRedundantRateDocument,
            variables: {
                input,
            },
        },
        result: {
            data: {
                withdrawAndReplaceRedundantRate: {
                    contract: mockContract,
                },
            },
        },
    }
}
