import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaSubmittedContractHelpers'
import type { ContractOrErrorArrayType } from './findAllContractsWithHistoryByState'

async function findAllContractsWithHistoryBySubmitInfo(
    client: PrismaTransactionType
): Promise<ContractOrErrorArrayType | NotFoundError | Error> {
    try {
        const contracts = await client.contractTable.findMany({
            where: {
                revisions: {
                    some: {
                        submitInfoID: {
                            not: null,
                        },
                    },
                },
                stateCode: {
                    not: 'AS', // exclude test state as per ADR 019
                },
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find all contracts by submit info`
            console.error(err)
            return new NotFoundError(err)
        }

        const parsedContracts: ContractOrErrorArrayType = contracts.map(
            (contract) => ({
                contractID: contract.id,
                contract: parseContractWithHistory(contract),
            })
        )

        return parsedContracts
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryBySubmitInfo }
