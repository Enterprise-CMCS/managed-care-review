import {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT_QUERY from '../../../../app-graphql/src/queries/fetchContract.graphql'

describe('fetchContract', () => {
    it('fetches the contract', async () => {
        const stateServer = await constructTestPostgresServer()

        const stateSubmission = await createTestHealthPlanPackage(stateServer)

        const fetchContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT_QUERY,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })
        expect(fetchContractResult.errors).toBeUndefined()
    })
})
