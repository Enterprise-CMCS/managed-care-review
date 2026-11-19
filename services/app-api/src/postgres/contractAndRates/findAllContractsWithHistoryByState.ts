import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaFullContractRateHelpers'
import { parseErrorToError } from '@mc-review/helpers'

type ContractOrErrorType = {
    contractID: string
    contract: ContractType | Error
}

type ContractOrErrorArrayType = ContractOrErrorType[]

async function findAllContractsWithHistoryByState(
    client: PrismaTransactionType,
    stateCode: string
): Promise<ContractOrErrorArrayType | NotFoundError | Error> {
    try {
        const contracts = await client.contractTable.findMany({
            where: {
                stateCode: {
                    equals: stateCode,
                },
                // ILOS submissions are served by indexIlosSubmissionsStripped
                contractSubmissionType: { not: 'ILOS' },
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find contracts with state code: ${stateCode}`
            console.error(err)
            return new NotFoundError(err)
        }

        return contracts.map((contract) => ({
            contractID: contract.id,
            contract: parseContractWithHistory(contract),
        }))
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return parseErrorToError(err)
    }
}

export { findAllContractsWithHistoryByState }
export type { ContractOrErrorArrayType }
