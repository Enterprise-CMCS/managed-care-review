import { describe, expect, it } from 'vitest'
import {
    EnvironmentConfigurationError,
    loadEnvironment,
} from '../src/config/environment'
import {
    MAX_SCALE,
    OperationInputError,
    parseOperationInput,
} from '../src/config/operationInput'

const validEnvironment = {
    SYNTHETIC_DATA_ENABLED: 'true',
    SYNTHETIC_DATA_STAGE: 'qa',
    SYNTHETIC_DATA_API_URL: 'https://api.example.com',
    SYNTHETIC_DATA_OAUTH_CLIENT_ID: 'synthetic-client',
    SYNTHETIC_DATA_OAUTH_CLIENT_SECRET: 'synthetic-secret',
}

describe('loadEnvironment', () => {
    it('accepts only enabled QA configuration and derives API endpoints', () => {
        expect(loadEnvironment(validEnvironment)).toEqual({
            stage: 'qa',
            apiBaseUrl: 'https://api.example.com/',
            graphqlEndpoint:
                'https://api.example.com/v1/graphql/external',
            tokenEndpoint: 'https://api.example.com/oauth/token',
            oauthClientId: 'synthetic-client',
            oauthClientSecret: 'synthetic-secret',
            maxAttempts: 4,
            retryBaseDelayMs: 250,
        })
    })

    it.each([
        { ...validEnvironment, SYNTHETIC_DATA_ENABLED: 'false' },
        { ...validEnvironment, SYNTHETIC_DATA_STAGE: 'prod' },
    ])('rejects disabled or non-QA execution', (environment) => {
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
})
