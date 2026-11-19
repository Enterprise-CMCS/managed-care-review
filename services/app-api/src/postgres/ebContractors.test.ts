import {
    findEBContractors,
    findEBContractorByID,
    selectEBContractor,
} from './ebContractors'
import type { PrismaTransactionType } from './prismaTypes'
import { NotFoundError } from './postgresErrors'

describe('EB contractor database reads', () => {
    const contractor = {
        id: 'database-only-id',
        name: 'Database Contractor',
        isDeprecated: true,
    }

    it.each([undefined, false, true])(
        'filters deprecated records unless requested (%s), retaining stable ordering',
        async (includeDeprecated) => {
            const findMany = vi.fn().mockResolvedValue([contractor])
            const client = {
                eBContractors: { findMany },
            } as unknown as PrismaTransactionType
            expect(await findEBContractors(client, includeDeprecated)).toEqual([
                contractor,
            ])
            expect(findMany).toHaveBeenCalledWith({
                where: includeDeprecated ? {} : { isDeprecated: false },
                select: selectEBContractor,
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
            })
        }
    )

    it('looks up an ID in the table rather than a static list', async () => {
        const findUnique = vi.fn().mockResolvedValue(contractor)
        const client = {
            eBContractors: { findUnique },
        } as unknown as PrismaTransactionType
        expect(await findEBContractorByID(client, contractor.id)).toEqual(
            contractor
        )
        expect(findUnique).toHaveBeenCalledWith({
            where: { id: contractor.id },
            select: selectEBContractor,
        })
        findUnique.mockResolvedValue(null)
        expect(await findEBContractorByID(client, 'missing')).toBeInstanceOf(
            NotFoundError
        )
    })

    it('returns database errors without treating them as missing IDs', async () => {
        const failure = new Error('Database unavailable')
        const client = {
            eBContractors: {
                findMany: vi.fn().mockRejectedValue(failure),
                findUnique: vi.fn().mockRejectedValue(failure),
            },
        } as unknown as PrismaTransactionType
        expect(await findEBContractors(client)).toBe(failure)
        expect(await findEBContractorByID(client, 'id')).toBe(failure)
    })
})
