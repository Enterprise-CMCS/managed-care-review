import { describe, expect, it, vi } from 'vitest'
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
})
