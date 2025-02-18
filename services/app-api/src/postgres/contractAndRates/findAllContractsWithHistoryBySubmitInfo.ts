import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaFullContractRateHelpers'
import type { ContractOrErrorArrayType } from './findAllContractsWithHistoryByState'
async function findAllContractsWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    useZod: boolean = true
): Promise<ContractOrErrorArrayType | NotFoundError | Error> {
    try {
        performance.mark('beginPostgresQuery')
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
        performance.mark('finishPostgresQuery')
        performance.measure(
            'findAllContractsWithHistoryBySubmitInfo: beginPostgresQuery to finishPostgresQuery',
            'beginPostgresQuery',
            'finishPostgresQuery'
        )

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find all contracts by submit info`
            console.error(err)
            return new NotFoundError(err)
        }

        performance.mark('beginParseContract')
        let parsedContracts: ContractOrErrorArrayType = []
        for (const contract of contracts) {
            const parsed = {
                contractID: contract.id,
                contract: parseContractWithHistory(contract, useZod),
            }
            parsedContracts = parsedContracts.concat(parsed)
        }
        performance.mark('finishParseContract')
        performance.measure(
            'findAllContractsWithHistoryBySubmitInfo: beginParseContract to finishParseContract',
            'beginParseContract',
            'finishParseContract'
        )
        return parsedContracts
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryBySubmitInfo }
