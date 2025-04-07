import { MockedResponse } from "@apollo/client/testing"
import { Contract, WithdrawContractDocument, WithdrawContractMutation } from "../gen/gqlClient"
import { mockContractPackageSubmittedWithQuestions } from "./contractPackageDataMock"
import { GraphQLError } from "graphql/error"

const withdrawContractMockSuccess = (
  params:{
    contractID?: string,
    contractData?: Partial<Contract>
    updatedReason?: string
  } = {}
): MockedResponse<WithdrawContractMutation> => {
  const {
    contractID = 'test-abc-123',
    contractData,
    updatedReason = 'a valid note',
  } = params
  const contract = mockContractPackageSubmittedWithQuestions(contractData?.id || contractID, {
    __typename: 'Contract',
    reviewStatus: 'WITHDRAWN',
    consolidatedStatus: 'WITHDRAWN',
    status: 'RESUBMITTED'
  })

  return {
    request: {
      query: WithdrawContractDocument,
      variables: {
        input: {
          contractID,
          updatedReason
        },
      },
    },
    result: {
      data: {
        withdrawContract: {
          contract,
        },
      },
    },
  }
}

const withdrawContractMockFailure = (): MockedResponse<WithdrawContractMutation> => {
  const graphQLError = new GraphQLError('Issue withdrawing submission', {
    extensions: {
      code: 'NOT_FOUND',
      cause: 'DB_ERROR',
    },
  })

  return {
    request: {
      query: WithdrawContractDocument,
      variables: {
        input: {
          contractID: 'test-abc-123',
          updatedReason: 'withdraw reason'
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
  withdrawContractMockSuccess,
  withdrawContractMockFailure
}