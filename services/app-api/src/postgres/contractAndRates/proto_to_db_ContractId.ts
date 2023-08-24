import type {
    PrismaClient,
    ContractTable,
    HealthPlanRevisionTable,
} from '@prisma/client'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

async function insertContractId(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<ContractTable | Error> {
    try {
        const stateCode = formData.stateCode
        const stateNumber = formData.stateNumber

        const state = await client.state.findUnique({
            where: { stateCode: stateCode },
        })

        if (!state) {
            const error = new Error(`State with code ${stateCode} not found`)
            return error
        }

        const contract = await client.contractTable.upsert({
            where: { id: revision.pkgID },
            create: {
                id: revision.pkgID,
                state: {
                    connect: {
                        stateCode: stateCode,
                    },
                },
                stateNumber: stateNumber,
                createdAt: revision.createdAt,
            },

            update: {
                stateNumber: stateNumber,
            },
        })

        return contract
    } catch (err) {
        const error = new Error(
            `Error creating contract ${JSON.stringify(err)}`
        )
        return error
    }
}

export { insertContractId }
