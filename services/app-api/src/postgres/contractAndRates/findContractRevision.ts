import type { PrismaTransactionType } from '../prismaTypes'
import {
    contractRevisionSchema,
    type ContractRevisionType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'

async function findContractRevision(
    client: PrismaTransactionType,
    contractRevID: string
): Promise<ContractRevisionType | Error> {
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
        console.info(
            `DEBUG: got back this contract: ${JSON.stringify(contractRev)}`
        )

        const parseResult = contractRevisionSchema.parse(contractRev)
        console.info(
            `DEBUG: got back this from parse: ${JSON.stringify(parseResult)}`
        )

        return parseResult
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractRevision }
