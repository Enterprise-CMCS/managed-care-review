import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractOrErrorArrayType } from './findAllContractsWithHistoryByState'
import { NotFoundError } from '../postgresErrors'
import { performance } from 'perf_hooks'
import { parseContractForDashboard } from './parseContractWithHistory'
import { includeContractForCMSDashboard } from './prismaFullContractRateHelpers'

async function findAllContractsForCMSDashboard(
    client: PrismaTransactionType
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
            include: {
                ...includeContractForCMSDashboard,
            },
        })

        performance.mark('finishPostgresQuery')
        performance.measure(
            'findAllContractsForCMSDashboard: beginPostgresQuery to finishPostgresQuery',
            'beginPostgresQuery',
            'finishPostgresQuery'
        )

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find all contracts by submit info`
            console.error(err)
            return new NotFoundError(err)
        }

        performance.mark('beginParseContract')
        const parsedContracts: ContractOrErrorArrayType = contracts.map(
            (contract) => ({
                contractID: contract.id,
                contract: parseContractForDashboard(contract),
            })
        )
        performance.mark('finishParseContract')
        performance.measure(
            'findAllContractsForCMSDashboard: beginParseContract to finishParseContract',
            'beginParseContract',
            'finishParseContract'
        )
        return parsedContracts
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsForCMSDashboard }
