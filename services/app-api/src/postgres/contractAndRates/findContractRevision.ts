import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import type { ContractRevisionTable } from '@prisma/client'

async function findContractRevision(
    client: PrismaTransactionType,
    contractRevID: string
): Promise<ContractRevisionTable | Error> {
    try {
        const contractRev = await client.contractRevisionTable.findUnique({
            where: {
                id: contractRevID,
            },
        })

        if (!contractRev) {
            const err = `PRISMA ERROR: Cannot find contract revision with id: ${contractRevID}`
            return new NotFoundError(err)
        }
        return contractRev
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractRevision }
