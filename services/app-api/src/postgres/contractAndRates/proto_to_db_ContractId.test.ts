import type {
    HealthPlanFormDataType,
    StateCodeType,
} from 'app-web/src/common-code/healthPlanFormDataType'

import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createMockRevision } from '../../testHelpers/protoMigratorHelpers'
import { toDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import { insertContractId } from './proto_to_db_ContractId'

describe('proto_to_db_ContractId', () => {
    it('inserts the contract and returns a ContractTable from the revision', async () => {
        const client = await sharedTestPrismaClient()
        const mockRevision = createMockRevision()
        // decode the proto
        const decodedFormDataProto = toDomain(mockRevision.formDataProto)
        if (decodedFormDataProto instanceof Error) {
            const error = new Error(
                `Error in toDomain for ${mockRevision.id}: ${decodedFormDataProto.message}`
            )
            return error
        }
        const formData = decodedFormDataProto as HealthPlanFormDataType

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
        // decode the proto
        const decodedFormDataProto = toDomain(mockRevision.formDataProto)
        if (decodedFormDataProto instanceof Error) {
            const error = new Error(
                `Error in toDomain for ${mockRevision.id}: ${decodedFormDataProto.message}`
            )
            return error
        }
        const formData = decodedFormDataProto as HealthPlanFormDataType
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
