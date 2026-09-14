import { describe, expect, it, vi } from 'vitest'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'
import {
    bootstrapSyntheticActors,
    validateSyntheticDataCredentials,
} from './bootstrap_synthetic_data'

describe('synthetic data actor bootstrap', () => {
    it('rejects credentials for a different stage or actor', () => {
        expect(() =>
            validateSyntheticDataCredentials(
                {
                    clientId: 'synthetic-data-other-review-state',
                    clientSecret: 'a'.repeat(64),
                },
                'synth-review',
                'state'
            )
        ).toThrow('Synthetic data credentials secret is invalid')
        expect(() =>
            validateSyntheticDataCredentials(
                {
                    clientId: 'synthetic-data-synth-review-state',
                    clientSecret: 'a'.repeat(64),
                },
                'synth-review',
                'cms'
            )
        ).toThrow('Synthetic data credentials secret is invalid')
    })

    it('upserts separate state and CMS actors with scoped clients', async () => {
        const userUpsert = vi.fn().mockResolvedValue({})
        const oAuthClientUpsert = vi.fn().mockResolvedValue({})
        const prismaClient = {
            user: { upsert: userUpsert },
            oAuthClient: { upsert: oAuthClientUpsert },
        } as unknown as ExtendedPrismaClient
        const credentials = {
            state: {
                clientId: 'synthetic-data-synth-review-state',
                clientSecret: 'a'.repeat(64),
            },
            cms: {
                clientId: 'synthetic-data-synth-review-cms',
                clientSecret: 'b'.repeat(64),
            },
        }

        const result = await bootstrapSyntheticActors(
            prismaClient,
            'synth-review',
            credentials
        )

        expect(userUpsert).toHaveBeenCalledTimes(2)
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
        expect(userUpsert).toHaveBeenCalledWith({
            where: { id: 'synthetic-data-synth-review-cms-user' },
            create: expect.objectContaining({
                role: 'CMS_USER',
                stateCode: null,
            }),
            update: expect.objectContaining({
                role: 'CMS_USER',
                stateCode: null,
            }),
        })
        expect(oAuthClientUpsert).toHaveBeenCalledTimes(2)
        for (const [actor, userID] of [
            ['state', 'synthetic-data-synth-review-state-user'],
            ['cms', 'synthetic-data-synth-review-cms-user'],
        ] as const) {
            const actorCredentials = credentials[actor]
            expect(oAuthClientUpsert).toHaveBeenCalledWith({
                where: { clientId: actorCredentials.clientId },
                create: expect.objectContaining({
                    grants: ['client_credentials'],
                    scopes: ['SYNTHETIC_DATA_WRITE'],
                    userID,
                }),
                update: expect.objectContaining({
                    clientSecret: actorCredentials.clientSecret,
                    grants: ['client_credentials'],
                    scopes: ['SYNTHETIC_DATA_WRITE'],
                    userID,
                }),
            })
        }
        expect(result).toEqual({
            success: true,
            stage: 'synth-review',
            actors: {
                state: {
                    userId: 'synthetic-data-synth-review-state-user',
                    clientId: credentials.state.clientId,
                },
                cms: {
                    userId: 'synthetic-data-synth-review-cms-user',
                    clientId: credentials.cms.clientId,
                },
            },
        })
    })
})
