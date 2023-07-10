import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { submitContract } from './submitContract'
import { createDraftContractData } from '../../testHelpers/contractHelpers'
import { must } from '../../testHelpers'
import { insertDraftContract } from './insertContract'

describe('insertContract', () => {
    it('creates a new draft submission', async () => {
        const client = await sharedTestPrismaClient()

        // submitting before there's a draft should be an error
        expect(
            await submitContract(client, '1111', '1111', 'failed submit')
        ).toBeInstanceOf(Error)

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
})
