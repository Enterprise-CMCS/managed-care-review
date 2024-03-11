import {
    FetchContractQuery,
    Contract,
    FetchContractDocument,
} from '../../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { mockContractPackageDraft } from './contractPackageDataMock'
import { GraphQLError } from 'graphql/index'

const fetchContractMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<FetchContractQuery> => {
    const contractData = mockContractPackageDraft(contract)

    return {
        request: {
            query: FetchContractDocument,
            variables: { input: { contractID: contractData.id } },
        },
        result: {
            data: {
                fetchContract: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

export { fetchContractMockSuccess }
