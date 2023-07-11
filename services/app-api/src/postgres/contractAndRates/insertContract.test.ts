import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    createDraftContractData,
    getStateRecord,
} from '../../testHelpers/contractAndRates/contractHelpers'
import { must } from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

describe('insertContract', () => {
    it('creates a new draft contract', async () => {
        const client = await sharedTestPrismaClient()

        // create a draft contract
        const draftContractData = createDraftContractData()
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )

        // Expect a single contract revision
        expect(draftContract.revisions).toHaveLength(1)

        // Expect draft contract to contain expected data.
        expect(draftContract).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                stateCode: 'MN',
                status: 'DRAFT',
                stateNumber: expect.any(Number),
                revisions: expect.arrayContaining([
                    expect.objectContaining({
                        formData: expect.objectContaining({
                            submissionType: 'CONTRACT_AND_RATES',
                            submissionDescription: 'Contract 1.0',
                            contractType: 'BASE',
                            programIDs: ['PMAP'],
                            populationCovered: 'MEDICAID',
                            riskBasedContract: false,
                        }),
                    }),
                ]),
            })
        )
    })
    it('returns an error when invalid state code is provided', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractData = createDraftContractData({
            stateCode: 'CANADA',
        })
        const draftContract = await insertDraftContract(
            client,
            draftContractData
        )

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(PrismaClientKnownRequestError)
    })
    it('increments state number count', async () => {
        const client = await sharedTestPrismaClient()
        const contractA = createDraftContractData({
            stateCode: 'MN',
        })
        const contractB = createDraftContractData({
            stateCode: 'MN',
        })
        const initialState = await getStateRecord(client, contractA.stateCode)

        must(await insertDraftContract(client, contractA))
        const stateAfterInsertContractA = await getStateRecord(
            client,
            contractA.stateCode
        )

        // Expect state record count to be incremented by 1
        expect(stateAfterInsertContractA.latestStateSubmissionNumber).toEqual(
            initialState.latestStateSubmissionNumber + 1
        )

        must(await insertDraftContract(client, contractB))
        const stateAfterInsertContractB = await getStateRecord(
            client,
            contractA.stateCode
        )

        // Expect state record count to be incremented by 2
        expect(stateAfterInsertContractB.latestStateSubmissionNumber).toEqual(
            initialState.latestStateSubmissionNumber + 2
        )
    })
})
