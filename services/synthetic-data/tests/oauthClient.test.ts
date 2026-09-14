import { describe, expect, it, vi } from 'vitest'
import { OAuthClient } from '../src/client/oauthClient'

describe('OAuthClient', () => {
    it('requests a client-credentials token with form encoding', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            Response.json({
                access_token: 'issued-token',
                token_type: 'Bearer',
                expires_in: 3600,
            })
        )
        const client = new OAuthClient({
            tokenEndpoint: 'https://api.example.com/oauth/token',
            clientId: 'synthetic-client',
            clientSecret: 'synthetic-secret',
            fetch: fetchMock,
        })

        await expect(client.requestToken()).resolves.toEqual({
            accessToken: 'issued-token',
            tokenType: 'Bearer',
            expiresInSeconds: 3600,
        })
        const request = fetchMock.mock.calls[0][1]
        expect(String(request?.body)).toBe(
            'grant_type=client_credentials&client_id=synthetic-client&client_secret=synthetic-secret'
        )
    })

    it('retries server failures and does not expose the client secret in errors', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response('', { status: 500 }))
            .mockResolvedValueOnce(
                Response.json(
                    { error: 'invalid_client' },
                    { status: 401 }
                )
            )
        const client = new OAuthClient({
            tokenEndpoint: 'https://api.example.com/oauth/token',
            clientId: 'synthetic-client',
            clientSecret: 'must-not-leak',
            fetch: fetchMock,
            retry: {
                maxAttempts: 2,
                baseDelayMs: 1,
                sleep: vi.fn().mockResolvedValue(undefined),
            },
        })

        const error = await client.requestToken().catch(
            (caught: unknown) => caught
        )
        expect(error).toBeInstanceOf(Error)
        expect(String(error)).toContain(
            'OAuth token request failed with status 401: invalid_client'
        )
        expect(String(error)).not.toContain('must-not-leak')
    })
})
