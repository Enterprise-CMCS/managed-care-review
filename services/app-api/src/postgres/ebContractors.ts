import { parseErrorToError } from '@mc-review/helpers'
import type { EBContractorType } from '../domain-models/EBContractorType'
import type { PrismaTransactionType } from './prismaTypes'
import { NotFoundError } from './postgresErrors'

export const selectEBContractor = {
    id: true,
    name: true,
    isDeprecated: true,
} as const

export async function findEBContractors(
    client: PrismaTransactionType
): Promise<EBContractorType[] | Error> {
    try {
        return await client.eBContractors.findMany({
            select: selectEBContractor,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
        })
    } catch (error) {
        return parseErrorToError(error)
    }
}

export async function findEBContractorByID(
    client: PrismaTransactionType,
    id: string
): Promise<EBContractorType | Error> {
    try {
        const contractor = await client.eBContractors.findUnique({
            where: { id },
            select: selectEBContractor,
        })
        return contractor ?? new NotFoundError('EB contractor not found')
    } catch (error) {
        return parseErrorToError(error)
    }
}
