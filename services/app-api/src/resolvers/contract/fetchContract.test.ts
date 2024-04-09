import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT from '../../../../app-graphql/src/queries/fetchContract.graphql'
import type { RateType } from '../../domain-models'
import { testStateUser } from '../../testHelpers/userHelpers'

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

    it('gets the right contract name', async () => {
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

        const draftContract =
            fetchDraftContractResult.data?.fetchContract.contract.draftRevision

        expect(draftContract.contractName).toMatch(/MCR-FL-\d{4}-MMA/)
    })

    it('errors if the wrong state user calls it', async () => {
        const stateServerFL = await constructTestPostgresServer()

        // Create a submission with a rate
        const stateSubmission =
            await createAndUpdateTestHealthPlanPackage(stateServerFL)

        const stateServerVA = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
        })

        const fetchResult = await stateServerVA.executeOperation({
            query: FETCH_CONTRACT,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'User from state VA not allowed to access contract from FL'
        )
    })
})
