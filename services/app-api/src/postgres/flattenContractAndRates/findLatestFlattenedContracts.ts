import type { PrismaTransactionType } from '../prismaTypes'
import type { FlattenContractsType } from '../../domain-models/flattenContractAndRateTypes/flattenContractTypes'
import { NotFoundError } from '../postgresErrors'
import { includeFlattenContract } from './prismaFlattenContractHelpers'
import { parseLatestFlattenContracts } from './parseFlattenContracts'

type FindLatestFlattenedContractsResult = {
    totalCount: number
    contracts: FlattenContractsType
}

// findLatestFlattenedContracts queries ContractTable and returns one
// FlattenContractType per contract using only the latest submitted revision.
// Returns all contracts — sorting and pagination are handled in the resolver.
async function findLatestFlattenedContracts(
    client: PrismaTransactionType
): Promise<FindLatestFlattenedContractsResult | NotFoundError | Error> {
    try {
        const whereClause: Record<string, unknown> = {
            revisions: { some: { submitInfoID: { not: null } } },
        }

        if (process.env.stage === 'prod') {
            whereClause.stateCode = { not: 'AS' }
        }

        const contracts = await client.contractTable.findMany({
            where: whereClause,
            include: includeFlattenContract,
        })

        if (!contracts) {
            const err =
                'PRISMA ERROR: Cannot find contracts for latest flatten export'
            console.error(err)
            return new NotFoundError(err)
        }

        const parsed = parseLatestFlattenContracts(contracts)
        if (parsed instanceof Error) {
            return parsed
        }

        return { totalCount: parsed.length, contracts: parsed }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findLatestFlattenedContracts }
