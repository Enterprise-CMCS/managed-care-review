import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT from '../../../../app-graphql/src/queries/fetchContract.graphql'
import type { RateType } from '../../domain-models'

describe('fetchContract', () => {
    it('fetches the draft contract and a new child rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const fetchDraftContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchDraftContractResult.errors).toBeUndefined()

        const draftRate = fetchDraftContractResult.data?.fetchContract.contract
            .draftRates as RateType[]

        //check that we have a rate that is returned and is in DRAFT
        expect(draftRate).toHaveLength(1)
        expect(draftRate[0].status).toBe('DRAFT')
        expect(draftRate[0].stateCode).toBe('FL')
    })
})
