import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../storeError'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaSubmittedContractHelpers'

async function findAllContractsWithHistoryByState(
    client: PrismaTransactionType,
    stateCode: string
): Promise<Array<ContractType | Error> | NotFoundError | Error> {
    try {
        const contracts = await client.contractTable.findMany({
            where: {
                stateCode: {
                    equals: stateCode,
                },
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find contracts with state code: ${stateCode}`
            console.error(err)
            return new NotFoundError(err)
        }

        const parsedContracts: Array<ContractType | Error> = contracts.map(
            (contract) => parseContractWithHistory(contract)
        )

        return parsedContracts
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryByState }
