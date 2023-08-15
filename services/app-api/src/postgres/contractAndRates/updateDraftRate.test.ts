import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftRate } from './insertRate'
import { must } from '../../testHelpers'
import { updateDraftRate } from './updateDraftRate'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import type { RateType } from '@prisma/client'

describe('updateDraftRate', () => {
    afterEach( () => {
        jest.clearAllMocks()
    })

    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftRateForm1 = { rateCertificationName: 'draftData' }

        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                ...draftRateForm1,
            })
        )

        const draftRateForm2 = { rateCertificationName: 'something else' }
        const draft = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm2,
                contractIDs: [],
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.rateCertificationName).toBe(
            'something else'
        )
    })

    it('returns an error when invalid form data for rate type provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
          const client = await sharedTestPrismaClient()
        const newRate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
            })
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftRate(client, {
            rateID: newRate.id,
            formData: {
                rateCertificationName: 'a new rate',
                rateType: 'BASE' as RateType,
            },
            contractIDs: [],
        })

        // Expect a prisma error
        expect(updatedRate).toBeInstanceOf(PrismaClientValidationError)
    })

    it('returns an error when invalid rate ID provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
        const client = await sharedTestPrismaClient()

        const draftRate = await updateDraftRate(client, {
            rateID: 'not-real-id',
            formData: {
                rateCertificationName: 'a new rate',
                rateType: 'AMENDMENT',
            },
            contractIDs: [],
        })

        // Expect a prisma error
        expect(draftRate).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })
})
