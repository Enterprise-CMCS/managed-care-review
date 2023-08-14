import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { must, getStateRecord } from '../../testHelpers'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'
import { insertDraftRate } from './insertRate'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'

describe('insertRate', () => {
    afterEach( () => {
        jest.clearAllMocks()
    })

    it('creates a new draft rate', async () => {
        const client = await sharedTestPrismaClient()

        // create a draft rate
        const draftRateData = createInsertRateData({ rateType: 'NEW' })
        const draftRate = must(await insertDraftRate(client, draftRateData))

        // Expect a new draft rate to have a draftRevision and no submitted revisions
        expect(draftRate.draftRevision).toBeDefined()
        expect(draftRate.revisions).toHaveLength(0)

        // Expect draft rate to contain expected data.
        expect(draftRate).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                stateCode: 'MN',
                status: 'DRAFT',
                stateNumber: expect.any(Number),
                draftRevision: expect.objectContaining({
                    formData: expect.objectContaining({
                        rateType: 'NEW',
                    }),
                }),
                revisions: []
            })
        )
    })
    it('increments state number count', async () => {
        const client = await sharedTestPrismaClient()
        const stateCode = 'VA'
        const initialState = await getStateRecord(client, stateCode)

        const rateA = createInsertRateData({
            stateCode,
        })
        const rateB = createInsertRateData({
            stateCode,
        })

        const submittedContractA = must(await insertDraftRate(client, rateA))

        // Expect state record count to be incremented by 1
        expect(submittedContractA.stateNumber).toEqual(
            initialState.latestStateRateCertNumber + 1
        )

        const submittedContractB = must(await insertDraftRate(client, rateB))

        // Expect state record count to be incremented by 2
        expect(submittedContractB.stateNumber).toEqual(
            initialState.latestStateRateCertNumber + 2
        )
    })
    it('returns an error when invalid state code is provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
        const client = await sharedTestPrismaClient()

        const draftRateData = createInsertRateData({
            stateCode: 'CANADA' as StateCodeType,
        })
        const draftRate = await insertDraftRate(client, draftRateData)

        // Expect a prisma error
        expect(draftRate).toBeInstanceOf(PrismaClientKnownRequestError)
        expect(console.error).toHaveBeenCalled()
    })
})
