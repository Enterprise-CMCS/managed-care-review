import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    must,
    createInsertContractData,
    getStateRecord,
} from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

describe('insertContract', () => {
    it('creates a new draft contract', async () => {
        const client = await sharedTestPrismaClient()

        // create a draft contract
        const draftContractData = createInsertContractData()
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )

        // Expect a single contract revision
        expect(draftContract.revisions).toHaveLength(0)

        // Expect draft contract to contain expected data.
        expect(draftContract).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                stateCode: 'MN',
                status: 'DRAFT',
                stateNumber: expect.any(Number),
                draftRevision: expect.objectContaining({
                    formData: expect.objectContaining({
                        submissionType: 'CONTRACT_AND_RATES',
                        submissionDescription: 'Contract 1.0',
                        contractType: 'BASE',
                        programIDs: ['PMAP'],
                        populationCovered: 'MEDICAID',
                        riskBasedContract: false,
                    }),
                }),
                revisions: [],
            })
        )
    })
    it('increments state number count', async () => {
        const client = await sharedTestPrismaClient()
        const stateCode = 'OH'
        const initialState = await getStateRecord(client, stateCode)
        const contractA = createInsertContractData({
            stateCode,
        })
        const contractB = createInsertContractData({
            stateCode,
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
    it('returns an error when invalid state code is provided', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractData = createInsertContractData({
            stateCode: 'CANADA',
        })
        const draftContract = await insertDraftContract(
            client,
            draftContractData
        )

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(PrismaClientKnownRequestError)
    })
})
