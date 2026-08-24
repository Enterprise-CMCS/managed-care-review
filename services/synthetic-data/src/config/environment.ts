import { z } from 'zod'

const positiveInteger = z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive())

const environmentSchema = z.object({
    SYNTHETIC_DATA_ENABLED: z.literal('true'),
    SYNTHETIC_DATA_STAGE: z.literal('qa'),
    SYNTHETIC_DATA_API_URL: z.string().url(),
    SYNTHETIC_DATA_OAUTH_CLIENT_ID: z.string().trim().min(1),
    SYNTHETIC_DATA_OAUTH_CLIENT_SECRET: z.string().min(1),
    SYNTHETIC_DATA_MAX_ATTEMPTS: positiveInteger
        .pipe(z.number().max(10))
        .default(4),
    SYNTHETIC_DATA_RETRY_BASE_DELAY_MS: positiveInteger
        .pipe(z.number().max(30_000))
        .default(250),
})

export type SyntheticDataEnvironment = {
    stage: 'qa'
    apiBaseUrl: string
    graphqlEndpoint: string
    tokenEndpoint: string
    oauthClientId: string
    oauthClientSecret: string
    maxAttempts: number
    retryBaseDelayMs: number
}

export class EnvironmentConfigurationError extends Error {
    readonly issues: ReadonlyArray<string>

    constructor(issues: ReadonlyArray<string>) {
        super(`Invalid synthetic-data environment: ${issues.join('; ')}`)
        this.name = 'EnvironmentConfigurationError'
        this.issues = issues
    }
}

export function loadEnvironment(
    input: Record<string, string | undefined> = process.env
): SyntheticDataEnvironment {
    const result = environmentSchema.safeParse(input)
    if (!result.success) {
        throw new EnvironmentConfigurationError(
            result.error.issues.map(
                (issue) => `${issue.path.join('.')}: ${issue.message}`
            )
        )
    }

    const baseUrl = new URL(result.data.SYNTHETIC_DATA_API_URL)
    const graphqlEndpoint = new URL('/v1/graphql/external', baseUrl)
    const tokenEndpoint = new URL('/oauth/token', baseUrl)

    return {
        stage: result.data.SYNTHETIC_DATA_STAGE,
        apiBaseUrl: baseUrl.toString(),
        graphqlEndpoint: graphqlEndpoint.toString(),
        tokenEndpoint: tokenEndpoint.toString(),
        oauthClientId: result.data.SYNTHETIC_DATA_OAUTH_CLIENT_ID,
        oauthClientSecret: result.data.SYNTHETIC_DATA_OAUTH_CLIENT_SECRET,
        maxAttempts: result.data.SYNTHETIC_DATA_MAX_ATTEMPTS,
        retryBaseDelayMs: result.data.SYNTHETIC_DATA_RETRY_BASE_DELAY_MS,
    }
}
