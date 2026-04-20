import type { PrismaTransactionType } from '../prismaTypes'
import type { StrippedContractType } from '../../domain-models/contractAndRates/contractTypes'
import { parseStrippedContractWithHistory } from './parseContractWithHistory'
import { includeStrippedContractWithoutDraftRates } from './prismaSubmittedContractHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'

type StrippedContractOrErrorType = {
    contractID: string
    contract: StrippedContractType | Error
}

type StrippedContractOrErrorArrayType = StrippedContractOrErrorType[]

type FindAllContractsStrippedType = {
    stateCode?: string
    contractIDs?: string[]
    includeDrafts?: boolean
}

async function findAllContractsStrippedInTransaction(
    tx: PrismaTransactionType,
    args?: FindAllContractsStrippedType
): Promise<StrippedContractOrErrorArrayType | Error> {
    const stateCode = args?.stateCode
    const contractIDs = args?.contractIDs
    const includeDrafts = args?.includeDrafts ?? false

    const whereClause: any = {
        id: contractIDs
            ? {
                  in: contractIDs,
              }
            : undefined,
    }

    if (!includeDrafts) {
        whereClause.revisions = {
            some: {
                submitInfoID: {
                    not: null,
                },
            },
        }
    }

    if (stateCode) {
        whereClause.stateCode = { equals: stateCode }
    } else if (process.env.stage === 'prod') {
        whereClause.stateCode = { not: 'AS' } // exclude test state as per ADR 019
    }

    const contracts = await tx.contractTable.findMany({
        where: whereClause,
        include: includeStrippedContractWithoutDraftRates,
    })

    const parsedContractsOrErrors: StrippedContractOrErrorArrayType =
        contracts.map((contract) => ({
            contractID: contract.id,
            contract: parseStrippedContractWithHistory(contract),
        }))

    return parsedContractsOrErrors
}

async function findAllContractsStripped(
    client: ExtendedPrismaClient,
    args?: FindAllContractsStrippedType
): Promise<StrippedContractOrErrorArrayType | Error> {
    try {
        return await client.$transaction(
            async (tx) => await findAllContractsStrippedInTransaction(tx, args)
        )
    } catch (err) {
        console.error(
            'PRISMA ERROR: Error finding all contracts for dashboard',
            err
        )
        return parseErrorToError(err)
    }
}

export { findAllContractsStripped }
export type { StrippedContractOrErrorArrayType, FindAllContractsStrippedType }
