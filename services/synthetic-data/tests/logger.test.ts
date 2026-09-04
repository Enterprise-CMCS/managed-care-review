import { describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '../src/client/graphqlClient'
import { Logger } from '../src/logger'

describe('Logger', () => {
    it('emits structured fields and redacts credentials and upload URLs', () => {
        const sink = vi.fn()
        const logger = new Logger({
            base: { environment: 'qa' },
            sink,
            now: () => new Date('2026-08-24T12:00:00.000Z'),
        })

        logger.info('synthetic.test', {
            scenarioKey: 'baseline-v1:core:001',
            clientSecret: 'do-not-log',
            nested: {
                accessToken: 'also-do-not-log',
                uploadURL: 'https://presigned.example.com/private',
            },
        })

        expect(JSON.parse(sink.mock.calls[0][0])).toEqual({
            timestamp: '2026-08-24T12:00:00.000Z',
            level: 'info',
            event: 'synthetic.test',
            environment: 'qa',
            scenarioKey: 'baseline-v1:core:001',
            clientSecret: '[REDACTED]',
            nested: {
                accessToken: '[REDACTED]',
                uploadURL: '[REDACTED]',
            },
        })
    })

    it('preserves structured error details and redacts nested credentials', () => {
        const sink = vi.fn()
        const logger = new Logger({
            sink,
            now: () => new Date('2026-09-03T21:05:00.000Z'),
        })
        const error = new GraphQLRequestError(
            'GraphQL operation returned errors',
            403,
            [
                {
                    message: 'State users cannot perform this operation',
                    extensions: {
                        code: 'FORBIDDEN',
                        clientSecret: 'do-not-log',
                    },
                },
            ]
        )

        logger.error('synthetic.cli.failed', error)

        expect(JSON.parse(sink.mock.calls[0][0])).toEqual({
            timestamp: '2026-09-03T21:05:00.000Z',
            level: 'error',
            event: 'synthetic.cli.failed',
            error: {
                name: 'GraphQLRequestError',
                message: 'GraphQL operation returned errors',
                status: 403,
                errors: [
                    {
                        message: 'State users cannot perform this operation',
                        extensions: {
                            code: 'FORBIDDEN',
                            clientSecret: '[REDACTED]',
                        },
                    },
                ],
            },
        })
    })
})
