import { describe, expect, it, vi } from 'vitest'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'
import {
    bootstrapSyntheticActor,
    validateSyntheticDataCredentials,
} from './bootstrap_synthetic_data'

describe('synthetic data actor bootstrap', () => {
    it('rejects credentials for a different stage', () => {
        expect(() =>
            validateSyntheticDataCredentials(
                {
                    clientId: 'synthetic-data-other-review-state',
                    clientSecret: 'a'.repeat(64),
                },
                'synth-review'
            )
        ).toThrow('Synthetic data credentials secret is invalid')
    })

    it('upserts one state actor and one narrowly scoped OAuth client', async () => {
        const userUpsert = vi.fn().mockResolvedValue({})
        const oAuthClientUpsert = vi.fn().mockResolvedValue({})
        const prismaClient = {
            user: { upsert: userUpsert },
            oAuthClient: { upsert: oAuthClientUpsert },
        } as unknown as ExtendedPrismaClient
        const credentials = {
            clientId: 'synthetic-data-synth-review-state',
            clientSecret: 'a'.repeat(64),
        }

        const result = await bootstrapSyntheticActor(
            prismaClient,
            'synth-review',
            credentials
        )

        expect(userUpsert).toHaveBeenCalledWith({
            where: { id: 'synthetic-data-synth-review-state-user' },
            create: expect.objectContaining({
                role: 'STATE_USER',
                stateCode: 'MN',
            }),
            update: expect.objectContaining({
                role: 'STATE_USER',
                stateCode: 'MN',
            }),
        })
        expect(oAuthClientUpsert).toHaveBeenCalledWith({
            where: { clientId: credentials.clientId },
            create: expect.objectContaining({
                grants: ['client_credentials'],
                scopes: ['SYNTHETIC_DATA_WRITE'],
                userID: 'synthetic-data-synth-review-state-user',
            }),
            update: expect.objectContaining({
                clientSecret: credentials.clientSecret,
                grants: ['client_credentials'],
                scopes: ['SYNTHETIC_DATA_WRITE'],
            }),
        })
        expect(result).toEqual({
            success: true,
            stage: 'synth-review',
            userId: 'synthetic-data-synth-review-state-user',
            clientId: credentials.clientId,
        })
    })
})
