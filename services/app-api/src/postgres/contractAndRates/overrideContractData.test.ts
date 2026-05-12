import type { ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import { overrideContractDataInsideTransaction } from './overrideContractData'

const { mockFindContractWithHistory } = vi.hoisted(() => ({
    mockFindContractWithHistory: vi.fn(),
}))

vi.mock('./findContractWithHistory', () => ({
    findContractWithHistory: mockFindContractWithHistory,
}))

const mockSubmittedContract = (
    overrides?: Partial<ContractType>
): ContractType =>
    ({
        id: 'contract-id',
        consolidatedStatus: 'SUBMITTED',
        packageSubmissions: [
            {
                contractRevision: {
                    id: 'contract-revision-id',
                },
            },
        ],
        ...overrides,
    }) as ContractType

describe('overrideContractDataInsideTransaction', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('creates contract metadata and revision overrides on the latest submitted revision', async () => {
        const create = vi.fn()
        const tx = {
            contractOverrides: {
                create,
            },
        } as unknown as PrismaTransactionType
        const overriddenContract = mockSubmittedContract({
            contractOverrides: [
                {
                    id: 'override-id',
                    createdAt: new Date(),
                    description: 'updated',
                    overrides: {
                        initiallySubmittedAt: new Date('2024-01-01'),
                        revisionOverride: {
                            id: 'revision-override-id',
                            createdAt: new Date(),
                            contractRevisionID: 'contract-revision-id',
                            contractType: 'AMENDMENT',
                        },
                    },
                },
            ],
        })

        mockFindContractWithHistory
            .mockResolvedValueOnce(mockSubmittedContract())
            .mockResolvedValueOnce(overriddenContract)

        const result = await overrideContractDataInsideTransaction(tx, {
            contractID: 'contract-id',
            updatedByID: 'user-id',
            description: 'updated',
            overrides: {
                initiallySubmittedAt: new Date('2024-01-01'),
                revisionOverride: {
                    contractType: 'AMENDMENT',
                },
            },
        })

        expect(result).toBe(overriddenContract)
        expect(create).toHaveBeenCalledWith({
            data: {
                contractID: 'contract-id',
                updatedByID: 'user-id',
                description: 'updated',
                initiallySubmittedAt: new Date('2024-01-01'),
                revisionOverride: {
                    create: {
                        contractRevision: {
                            connect: {
                                id: 'contract-revision-id',
                            },
                        },
                        contractType: 'AMENDMENT',
                    },
                },
            },
        })
    })

    it('rejects overrides unless the contract is submitted or resubmitted', async () => {
        const tx = {
            contractOverrides: {
                create: vi.fn(),
            },
        } as unknown as PrismaTransactionType

        mockFindContractWithHistory.mockResolvedValueOnce(
            mockSubmittedContract({
                consolidatedStatus: 'DRAFT',
            })
        )

        await expect(
            overrideContractDataInsideTransaction(tx, {
                contractID: 'contract-id',
                updatedByID: 'user-id',
                description: 'updated',
                overrides: {
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                    },
                },
            })
        ).rejects.toThrow(
            'Cannot override data, contract consolidated status must be SUBMITTED or RESUBMITTED. Consolidated status: DRAFT'
        )

        expect(tx.contractOverrides.create).not.toHaveBeenCalled()
    })
})
