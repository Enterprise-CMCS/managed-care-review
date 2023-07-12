import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    must,
    createDraftContractData,
    getStateRecord,
} from '../../testHelpers'
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
        const initialState = await getStateRecord(client, 'MN')
        const contractA = createDraftContractData({
            stateCode: 'MN',
        })
        const contractB = createDraftContractData({
            stateCode: 'MN',
        })

        const submittedContractA = must(
            await insertDraftContract(client, contractA)
        )

        // Expect state record count to be incremented by 1
        expect(submittedContractA.stateNumber).toEqual(
            initialState.latestStateSubmissionNumber + 1
        )

        const submittedContractB = must(
            await insertDraftContract(client, contractB)
        )

        // Expect state record count to be incremented by 2
        expect(submittedContractB.stateNumber).toEqual(
            initialState.latestStateSubmissionNumber + 2
        )
    })
})
