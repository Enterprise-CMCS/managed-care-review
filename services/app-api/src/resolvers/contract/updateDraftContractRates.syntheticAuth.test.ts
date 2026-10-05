import { afterEach, expect, it, vi } from 'vitest'
import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { Store } from '../../postgres'
import { defaultContext } from '../../testHelpers/gqlHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { updateDraftContractRates } from './updateDraftContractRates'

afterEach(() => {
    vi.unstubAllEnvs()
})

it('allows the synthetic state actor to update rates in its exact review stage', async () => {
    vi.stubEnv('stage', 'synth-review')
    vi.stubEnv('SYNTHETIC_DATA_ENABLED', 'true')
    vi.stubEnv('SYNTHETIC_DATA_ALLOWED_STAGE', 'synth-review')

    const updatedAt = new Date('2026-01-01T00:00:00.000Z')
    const contract = {
        id: 'synthetic-contract',
        stateCode: 'MN',
        status: 'DRAFT',
        consolidatedStatus: 'DRAFT',
        draftRevision: { updatedAt },
        draftRates: [],
    }
    const updateRates = vi.fn().mockResolvedValue(contract)
    const store = {
        findContractWithHistory: vi.fn().mockResolvedValue(contract),
        findStatePrograms: vi.fn().mockReturnValue([]),
        updateDraftContractRates: updateRates,
    } as unknown as Store
    const context: Context = {
        ...defaultContext(),
        user: testStateUser({ stateCode: 'MN' }),
        oauthClient: {
            clientId: 'synthetic-data-synth-review-state',
            grants: ['client_credentials'],
            iss: 'mcreview-synth-review',
            scopes: ['SYNTHETIC_DATA_WRITE'],
            isDelegatedUser: false,
        },
    }
    const resolver = updateDraftContractRates(store)
    if (typeof resolver !== 'function') {
        throw new Error('Expected updateDraftContractRates resolver function')
    }

    const result = await resolver(
        {},
        {
            input: {
                contractID: contract.id,
                lastSeenUpdatedAt: updatedAt,
                updatedRates: [],
            },
        },
        context,
        {} as GraphQLResolveInfo
    )

    expect(updateRates).toHaveBeenCalledWith({
        contractID: contract.id,
        rateUpdates: {
            create: [],
            update: [],
            link: [],
            unlink: [],
            delete: [],
        },
    })
    expect(result.contract).toBe(contract)
})
