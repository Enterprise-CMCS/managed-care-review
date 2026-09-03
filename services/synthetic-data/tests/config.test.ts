import { describe, expect, it } from 'vitest'
import {
    EnvironmentConfigurationError,
    loadEnvironment,
} from '../src/config/environment'
import {
    MAX_SCALE,
    OperationInputError,
    parseOperationInput,
    parseReviewSeedInput,
} from '../src/config/operationInput'

const validEnvironment = {
    SYNTHETIC_DATA_ENABLED: 'true',
    SYNTHETIC_DATA_STAGE: 'qa',
    SYNTHETIC_DATA_API_URL: 'https://api.example.com',
    SYNTHETIC_DATA_OAUTH_CLIENT_ID: 'synthetic-client',
    SYNTHETIC_DATA_OAUTH_CLIENT_SECRET: 'synthetic-secret',
}

describe('loadEnvironment', () => {
    it('accepts enabled QA configuration and derives API endpoints', () => {
        expect(loadEnvironment(validEnvironment)).toEqual({
            stage: 'qa',
            apiBaseUrl: 'https://api.example.com/',
            graphqlEndpoint: 'https://api.example.com/v1/graphql/external',
            tokenEndpoint: 'https://api.example.com/oauth/token',
            oauthClientId: 'synthetic-client',
            oauthClientSecret: 'synthetic-secret',
            maxAttempts: 4,
            retryBaseDelayMs: 250,
        })
    })

    it('preserves the API Gateway review stage path', () => {
        expect(
            loadEnvironment({
                ...validEnvironment,
                SYNTHETIC_DATA_STAGE: 'synth-review',
                SYNTHETIC_DATA_API_URL:
                    'https://abc.execute-api.us-east-1.amazonaws.com/synth-review',
            })
        ).toMatchObject({
            stage: 'synth-review',
            apiBaseUrl:
                'https://abc.execute-api.us-east-1.amazonaws.com/synth-review/',
            graphqlEndpoint:
                'https://abc.execute-api.us-east-1.amazonaws.com/synth-review/v1/graphql/external',
            tokenEndpoint:
                'https://abc.execute-api.us-east-1.amazonaws.com/synth-review/oauth/token',
        })
    })

    it.each([
        { ...validEnvironment, SYNTHETIC_DATA_ENABLED: 'false' },
        { ...validEnvironment, SYNTHETIC_DATA_STAGE: 'prod' },
    ])('rejects disabled or unsafe execution', (environment) => {
        expect(() => loadEnvironment(environment)).toThrow(
            EnvironmentConfigurationError
        )
    })
})

describe('parseOperationInput', () => {
    it('requires explicit reset confirmation', () => {
        expect(() =>
            parseOperationInput([
                '--operation',
                'reset-and-seed',
                '--profile',
                'baseline-v1',
                '--scale',
                '1',
            ])
        ).toThrow(OperationInputError)
    })

    it('parses an allowlisted append profile', () => {
        expect(
            parseOperationInput([
                '--operation=append',
                '--profile=rolling-v1',
                '--scale=2',
                '--seed=weekday-2026-08-24',
            ])
        ).toEqual({
            operation: 'append',
            profile: 'rolling-v1',
            scale: 2,
            seed: 'weekday-2026-08-24',
        })
    })

    it('rejects unbounded scale', () => {
        expect(() =>
            parseOperationInput([
                '--operation=verify',
                '--profile=baseline-v1',
                `--scale=${MAX_SCALE + 1}`,
            ])
        ).toThrow(OperationInputError)
    })

    it('rejects unknown operation arguments', () => {
        expect(() =>
            parseOperationInput([
                '--operation=verify',
                '--profile=baseline-v1',
                '--scale=1',
                '--unexpected=value',
            ])
        ).toThrow(OperationInputError)
    })
})

describe('parseReviewSeedInput', () => {
    it('accepts a bounded filesystem-safe seed', () => {
        expect(parseReviewSeedInput(['--seed=review-2026.09_03'])).toEqual({
            seed: 'review-2026.09_03',
        })
    })

    it('rejects missing, invalid, and unexpected seed arguments', () => {
        const invalidArguments: string[][] = [
            [],
            ['--seed=contains spaces'],
            ['--seed=review', '--scale=1'],
        ]

        for (const args of invalidArguments) {
            expect(() => parseReviewSeedInput(args)).toThrow(
                OperationInputError
            )
        }
    })
})
