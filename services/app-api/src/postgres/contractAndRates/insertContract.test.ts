import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { must, mockInsertContractArgs, getStateRecord } from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import type { StateCodeType } from '@mc-review/hpp'

describe('insertContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('creates a new draft contract', async () => {
        const client = await sharedTestPrismaClient()

        // create a draft contract
        const draftContractData = mockInsertContractArgs({
            contractType: 'BASE',
        })
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )

        // Expect a new draft contract to have a draftRevision no submitted revisions
        expect(draftContract.draftRevision).toBeDefined()
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
                        programIDs: draftContractData.programIDs,
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
        const contractA = mockInsertContractArgs({
            stateCode,
        })
        const contractB = mockInsertContractArgs({
            stateCode,
        })

        const submittedContractA = must(
            await insertDraftContract(client, contractA)
        )
        // Expect state record count to be incremented
        expect(submittedContractA.stateNumber).toBeGreaterThan(
            initialState.latestStateRateCertNumber
        )

        const submittedContractB = must(
            await insertDraftContract(client, contractB)
        )

        // Expect state record count to be incremented further
        expect(submittedContractB.stateNumber).toBeGreaterThan(
            submittedContractA.stateNumber
        )
    })
    it('returns an error when invalid state code is provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
        const client = await sharedTestPrismaClient()

        const draftContractData = mockInsertContractArgs({
            stateCode: 'MN' as StateCodeType,
            programIDs: [],
        })

        draftContractData.stateCode = 'CANADA'

        const draftContract = await insertDraftContract(
            client,
            draftContractData
        )

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(PrismaClientKnownRequestError)
        expect(console.error).toHaveBeenCalled()
    })
})
