import { describe, expect, it, vi } from 'vitest'
import type { GraphQLResolveInfo } from 'graphql'
import type { UpdateContractRateInput } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { defaultContext } from '../../testHelpers/gqlHelpers'
import { mockRateFormDataInput as gqlRateFormDataInput } from '../../testHelpers/rateDataMocks'
import { testStateUser } from '../../testHelpers/userHelpers'
import { updateDraftContractRates } from './updateDraftContractRates'

// Date scalars have already been parsed when GraphQL invokes the resolver.
function mockRateFormDataInput() {
    return {
        ...gqlRateFormDataInput(),
        rateDateStart: new Date('2024-01-01'),
        rateDateEnd: new Date('2025-01-01'),
        amendmentEffectiveDateStart: new Date('2024-02-01'),
        amendmentEffectiveDateEnd: new Date('2025-02-01'),
    }
}

function setupResolver() {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z')
    const contract = {
        id: 'test-contract',
        stateCode: 'MN',
        consolidatedStatus: 'DRAFT',
        draftRevision: { updatedAt },
        draftRates: [],
    }
    const store = {
        findContractWithHistory: vi.fn().mockResolvedValue(contract),
        findStatePrograms: vi.fn().mockReturnValue([]),
        findRateWithHistory: vi.fn().mockResolvedValue({
            id: 'linked-rate',
            consolidatedStatus: 'SUBMITTED',
        }),
        updateDraftContractRates: vi.fn().mockResolvedValue(contract),
    }
    const resolver = updateDraftContractRates(store as unknown as Store)
    if (typeof resolver !== 'function') {
        throw new Error('Expected updateDraftContractRates resolver function')
    }

    return {
        store,
        contract,
        run: (updatedRates: UpdateContractRateInput[]) =>
            resolver(
                {},
                {
                    input: {
                        contractID: contract.id,
                        lastSeenUpdatedAt: updatedAt,
                        updatedRates,
                    },
                },
                {
                    ...defaultContext(),
                    user: testStateUser({ stateCode: 'MN' }),
                },
                {} as GraphQLResolveInfo
            ),
    }
}

describe('updateDraftContractRates input validation', () => {
    it('accepts CREATE without rateID and LINK without formData', async () => {
        const { run, store, contract } = setupResolver()

        const result = await run([
            { type: 'CREATE', formData: mockRateFormDataInput() },
            { type: 'LINK', rateID: 'linked-rate' },
        ])

        expect(result.contract).toBe(contract)
        expect(store.updateDraftContractRates).toHaveBeenCalledWith({
            contractID: contract.id,
            rateUpdates: {
                create: [{ formData: expect.any(Object), ratePosition: 1 }],
                update: [],
                link: [{ rateID: 'linked-rate', ratePosition: 2 }],
                unlink: [],
                delete: [],
            },
        })
    })

    it.each<{ name: string; input: UpdateContractRateInput }>([
        {
            name: 'CREATE with rateID',
            input: {
                type: 'CREATE',
                rateID: 'unexpected-rate',
                formData: mockRateFormDataInput(),
            },
        },
        {
            name: 'CREATE with null rateID',
            input: {
                type: 'CREATE',
                rateID: null,
                formData: mockRateFormDataInput(),
            },
        },
        {
            name: 'CREATE without formData',
            input: { type: 'CREATE' },
        },
        {
            name: 'LINK with formData',
            input: {
                type: 'LINK',
                rateID: 'linked-rate',
                formData: mockRateFormDataInput(),
            },
        },
        {
            name: 'LINK with null formData',
            input: { type: 'LINK', rateID: 'linked-rate', formData: null },
        },
        {
            name: 'LINK without rateID',
            input: { type: 'LINK' },
        },
        {
            name: 'UPDATE without rateID',
            input: { type: 'UPDATE', formData: mockRateFormDataInput() },
        },
        {
            name: 'UPDATE without formData',
            input: { type: 'UPDATE', rateID: 'updated-rate' },
        },
    ])('rejects $name before accessing the store', async ({ input }) => {
        const { run, store } = setupResolver()

        await expect(run([input])).rejects.toMatchObject({
            extensions: { code: 'BAD_USER_INPUT' },
        })
        expect(store.findContractWithHistory).not.toHaveBeenCalled()
        expect(store.updateDraftContractRates).not.toHaveBeenCalled()
    })
})
