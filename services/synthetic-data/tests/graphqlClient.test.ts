import { describe, expect, it, vi } from 'vitest'
import { GraphQLClient } from '../src/client/graphqlClient'
import { SyntheticFetchCurrentUserDocument } from '../src/gen/gqlClient'

describe('GraphQLClient', () => {
    it('retries transient HTTP failures and returns typed data', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response('temporarily unavailable', { status: 503 })
            )
            .mockResolvedValueOnce(
                Response.json({
                    data: {
                        fetchCurrentUser: {
                            __typename: 'StateUser',
                            id: 'synthetic-user-id',
                            role: 'STATE_USER',
                        },
                    },
                })
            )
        const sleep = vi.fn().mockResolvedValue(undefined)
        const client = new GraphQLClient({
            endpoint: 'https://api.example.com/v1/graphql/external',
            accessToken: () => 'test-token',
            fetch: fetchMock,
            retry: { maxAttempts: 2, baseDelayMs: 1, sleep },
        })

        const result = await client.execute(
            SyntheticFetchCurrentUserDocument,
            {}
        )

        expect(result.fetchCurrentUser.id).toBe('synthetic-user-id')
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(sleep).toHaveBeenCalledWith(1)
        const request = fetchMock.mock.calls[1][1]
        expect(request?.headers).toEqual(
            expect.objectContaining({ Authorization: 'Bearer test-token' })
        )
        expect(JSON.parse(String(request?.body))).toEqual(
            expect.objectContaining({
                operationName: 'SyntheticFetchCurrentUser',
                variables: {},
            })
        )
    })

    it('reports GraphQL errors without retrying a successful HTTP response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            Response.json({
                errors: [{ message: 'Forbidden' }],
            })
        )
        const client = new GraphQLClient({
            endpoint: 'https://api.example.com/v1/graphql/external',
            accessToken: () => 'test-token',
            fetch: fetchMock,
            retry: { maxAttempts: 3, baseDelayMs: 1 },
        })

        await expect(
            client.execute(SyntheticFetchCurrentUserDocument, {})
        ).rejects.toMatchObject({
            name: 'GraphQLRequestError',
            status: 200,
            errors: [{ message: 'Forbidden' }],
        })
        expect(fetchMock).toHaveBeenCalledOnce()
    })
})
