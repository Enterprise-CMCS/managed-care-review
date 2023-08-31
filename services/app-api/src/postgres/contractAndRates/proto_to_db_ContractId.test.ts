import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'

import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createMockRevision } from '../../testHelpers/protoMigratorHelpers'
import { insertContractId } from './proto_to_db_ContractId'
import { decodeFormDataProto } from '../../handlers/proto_to_db'

describe('proto_to_db_ContractId', () => {
    it('inserts the contract and returns a ContractTable from the revision', async () => {
        const client = await sharedTestPrismaClient()
        const mockRevision = createMockRevision()

        const formData = decodeFormDataProto(mockRevision)
        if (formData instanceof Error) {
            return formData
        }

        const contractData = await insertContractId(
            client,
            mockRevision,
            formData
        )
        expect(contractData).toHaveProperty('id')
        expect(contractData).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                stateCode: 'MN',
                stateNumber: expect.any(Number),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            })
        )
    })

    it('returns an error when an invalid state code is provided', async () => {
        const client = await sharedTestPrismaClient()
        const mockRevision = createMockRevision()

        const formData = decodeFormDataProto(mockRevision)
        if (formData instanceof Error) {
            return formData
        }

        formData.stateCode = 'MEXICO' as StateCodeType

        const contractData = await insertContractId(
            client,
            mockRevision,
            formData
        )

        // Expect a prisma error
        expect(contractData).toBeInstanceOf(Error)
    })
})
