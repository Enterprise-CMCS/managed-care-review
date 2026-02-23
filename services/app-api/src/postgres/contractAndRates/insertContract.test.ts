import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { must, mockInsertContractArgs, getStateRecord } from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import { Prisma } from '@prisma/client'
import type { StateCodeType } from '@mc-review/submissions'

describe('insertContract', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('creates a new health plan and EQRO draft contracts', async () => {
        const client = await sharedTestPrismaClient()

        // create a draft contract
        const healthPlanContractData = mockInsertContractArgs({
            contractType: 'BASE',
            contractSubmissionType: 'HEALTH_PLAN',
        })
        const eqroContractData = mockInsertContractArgs({
            contractType: 'BASE',
            contractSubmissionType: 'EQRO',
        })
        const draftHealPlanContract = must(
            await insertDraftContract(client, healthPlanContractData)
        )

        const draftEQROContract = must(
            await insertDraftContract(client, eqroContractData)
        )

        // Expect a new draft health plan contract to have a draftRevision no submitted revisions
        expect(draftHealPlanContract.draftRevision).toBeDefined()
        expect(draftHealPlanContract.revisions).toHaveLength(0)
        // Expect health plan contract submission type
        expect(draftHealPlanContract.contractSubmissionType).toEqual(
            'HEALTH_PLAN'
        )

        // Expect draft contract to contain expected data.
        expect(draftHealPlanContract).toEqual(
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
                        programIDs: healthPlanContractData.programIDs,
                        populationCovered: 'MEDICAID',
                        riskBasedContract: false,
                    }),
                }),
                revisions: [],
            })
        )

        // Expect a new EQRO draft contract to have a draftRevision no submitted revisions
        expect(draftEQROContract.draftRevision).toBeDefined()
        expect(draftEQROContract.revisions).toHaveLength(0)
        // Expect EQRO contract submission type
        expect(draftEQROContract.contractSubmissionType).toEqual('EQRO')

        // Expect draft contract to contain expected data.
        expect(draftEQROContract).toEqual(
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
                        programIDs: eqroContractData.programIDs,
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
        vi.spyOn(console, 'error').mockImplementation(() => {})
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
        expect(draftContract).toBeInstanceOf(
            Prisma.PrismaClientKnownRequestError
        )
        expect(console.error).toHaveBeenCalled()
    })
})
