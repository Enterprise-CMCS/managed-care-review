import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaSubmittedContractHelpers'

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
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find contracts with state code: ${stateCode}`
            console.error(err)
            return new NotFoundError(err)
        }

        const parsedContractsOrErrors: ContractOrErrorArrayType = contracts.map(
            (contract) => ({
                contractID: contract.id,
                contract: parseContractWithHistory(contract),
            })
        )

        return parsedContractsOrErrors
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryByState }
export type { ContractOrErrorArrayType }
