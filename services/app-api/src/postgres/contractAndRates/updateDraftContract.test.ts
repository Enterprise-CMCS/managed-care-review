import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { createInsertContractData, must } from '../../testHelpers'
import { updateDraftContract } from './updateDraftContract'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import { ContractType} from '@prisma/client'

describe('updateDraftContract', () => {
    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 =  createInsertContractData({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {stateCode, ...draftContractFormData} = draftContractForm1
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        const draftContractForm2 = { ...draftContractFormData, submissionDescription: 'something else'}
        const draft = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
                rateIDs: [],
            })
        )

        expect(draft.revisions).toHaveLength(1)
        expect(draft?.revisions[0]?.formData.submissionDescription).toBe(
            'something else'
        )
    })

    it('returns an error when invalid form data for contract type provided', async () => {
        const client = await sharedTestPrismaClient()
        const draftContractInsert =  createInsertContractData({})
        const newRate = must(
            await insertDraftContract(client, draftContractInsert)
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftContract(client, {
            contractID: newRate.id,
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'NOT_REAL' as ContractType,
            },
            rateIDs: [],
        })

        // Expect a prisma error
        expect(updatedRate).toBeInstanceOf(PrismaClientValidationError)
    })

    it('returns an error when invalid contract ID provided', async () => {
        const client = await sharedTestPrismaClient()

        const draftContract = await updateDraftContract(client, {
            contractID: 'not-real-id',
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'AMENDMENT',
            },
            rateIDs: [],
        })

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })
})
