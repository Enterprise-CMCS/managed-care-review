import type { PrismaTransactionType } from '../prismaTypes'
import type { FlattenContractsType } from '../../domain-models/flattenContractAndRateTypes/flattenContractTypes'
import { NotFoundError } from '../postgresErrors'
import { includeFlattenContract } from './prismaFlattenContractHelpers'
import { parseFlattenContracts } from './parseFlattenContracts'

// findAllFlattenedContracts queries ContractTable and returns
// FlattenContractsType — one row per contract revision with associated
// flattened rate revisions.
// Set includeDrafts to true to also return draft (unsubmitted) revisions.
async function findAllFlattenedContracts(
    client: PrismaTransactionType,
    includeDrafts: boolean = false
): Promise<FlattenContractsType | NotFoundError | Error> {
    try {
        const whereClause: Record<string, unknown> = {}

        if (!includeDrafts) {
            whereClause.revisions = {
                some: { submitInfoID: { not: null } },
            }
        }

        if (process.env.stage === 'prod') {
            whereClause.stateCode = { not: 'AS' }
        }

        const contracts = await client.contractTable.findMany({
            where: whereClause,
            include: includeFlattenContract,
        })

        if (!contracts) {
            const err = 'PRISMA ERROR: Cannot find contracts for flatten export'
            console.error(err)
            return new NotFoundError(err)
        }

        return parseFlattenContracts(contracts)
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllFlattenedContracts }
