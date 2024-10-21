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
            include: {
                contract: {
                    include: {
                        revisions: true,
                    },
                },
            },
        })

        if (!contractRev) {
            const err = `PRISMA ERROR: Cannot find contract revision with id: ${contractRevID}`
            return new NotFoundError(err)
        }
        console.info(
            `DEBUG: got back this contract: ${JSON.stringify(contractRev)}`
        )

        const parseResult = contractRevisionSchema.safeParse(contractRev)
        if (!parseResult.success) {
            const error = new Error(
                `Zod parsing error: ${parseResult.error.message}`
            )
            console.error(error)
            return error
        }
        console.info(
            `DEBUG: got back this from parse: ${JSON.stringify(parseResult.data)}`
        )

        return parseResult.data
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractRevision }
