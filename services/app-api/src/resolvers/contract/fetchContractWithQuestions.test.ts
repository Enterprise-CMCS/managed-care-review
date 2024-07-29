import {
    constructTestPostgresServer,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT_WITH_QUESTIONS from '../../../../app-graphql/src/queries/fetchContractWithQuestions.graphql'
// import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    // createAndUpdateTestContractWithRate,
    // fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
// import { addNewRateToTestContract } from '../../testHelpers/gqlRateHelpers'
import { testS3Client } from '../../testHelpers'

describe('fetchContract', () => {
    const mockS3 = testS3Client()

    it('returns questions associated with a contract', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const draft = await createAndUpdateTestContractWithoutRates(stateServer)
        const stateSubmission =
            await submitTestContract(stateServer, draft.id)

        const fetchDraftContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT_WITH_QUESTIONS,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchDraftContractResult.errors).toBeUndefined()

        const draftContract =
            fetchDraftContractResult.data?.fetchContract.contract.draftRevision

        expect(draftContract.contractName).toMatch(/MCR-FL-\d{4}-NEMTMTM/)
    })

    // it('errors if the wrong state user calls it', async () => {
    //     const stateServerFL = await constructTestPostgresServer({
    //         s3Client: mockS3,
    //     })

    //     // Create a submission with a rate
    //     const stateSubmission =
    //         await createAndUpdateTestHealthPlanPackage(stateServerFL)

    //     const stateServerVA = await constructTestPostgresServer({
    //         context: {
    //             user: testStateUser({
    //                 stateCode: 'VA',
    //                 email: 'aang@mn.gov',
    //             }),
    //         },
    //     })

    //     const fetchResult = await stateServerVA.executeOperation({
    //         query: FETCH_CONTRACT,
    //         variables: {
    //             input: {
    //                 contractID: stateSubmission.id,
    //             },
    //         },
    //     })

    //     expect(fetchResult.errors).toBeDefined()
    //     if (fetchResult.errors === undefined) {
    //         throw new Error('type narrow')
    //     }

    //     expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
    //     expect(fetchResult.errors[0].message).toBe(
    //         'User from state VA not allowed to access contract from FL'
    //     )
    // })
})
