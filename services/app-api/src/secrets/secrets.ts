import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import type { GetSecretValueResponse } from '@aws-sdk/client-secrets-manager'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { parseErrorToError } from '@mc-review/helpers'

interface APISecrets {
    pgConnectionURL: string
}

async function FetchSecrets(
    secretManagerSecret: string
): Promise<Secret | Error> {
    const tracer = trace.getTracer('secrets-manager')
    const span = tracer.startSpan('secrets.fetch', {
        attributes: {
            'secrets.secret_name': secretManagerSecret,
        },
    })

    try {
        const secretsResult = await getSecretValue(secretManagerSecret)
        if (secretsResult instanceof Error) {
            console.info('Error: Failed to get secrets', secretsResult)
            span.recordException(secretsResult)
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Failed to talk to AWS SecretsManager',
            })
            span.end()
            return new Error('Failed to talk to AWS SecretsManager')
        }

        // Log username to correlate with credential rotations
        // (password is never logged)
        span.setAttributes({
            'secrets.username': secretsResult.username,
            'secrets.dbname': secretsResult.dbname,
            'secrets.host': secretsResult.host,
        })
        span.setStatus({ code: SpanStatusCode.OK })
        span.end()

        return secretsResult
    } catch (error) {
        const err = parseErrorToError(error)
        span.recordException(err)
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message,
        })
        span.end()
        console.error('Unexpected error fetching secrets:', err)
        return new Error('Failed to fetch secrets from AWS SecretsManager')
    }
}

interface Secret {
    dbClusterIdentifier: string
    password: string
    dbname: string
    engine: string
    port: number
    host: string
    username: string
}

async function getSecretValue(
    secretManagerSecret: string
): Promise<Secret | Error> {
    // lookup secrets manager secret from env
    const params = {
        SecretId: secretManagerSecret,
    }

    // connect to secrets manager and grab the secrets
    const secretsManager = new SecretsManagerClient({
        region: 'us-east-1',
    })

    const command = new GetSecretValueCommand(params)
    const secretResponse: GetSecretValueResponse =
        await secretsManager.send(command)

    // parse the secrets. we store as a string.
    const secret = JSON.parse(secretResponse.SecretString ?? '') as Secret

    if (!secret.username || !secret.password) {
        console.info('Error: failed to get secrets', secret)
        return new Error(
            'Could not retrieve postgres credentials from secrets manager'
        )
    }

    return secret
}

function getConnectionURL(secrets: Secret): string {
    const postgresURL = `postgresql://${secrets.username}:${encodeURIComponent(
        secrets.password
    )}@${secrets.host}:${secrets.port}/${
        secrets.dbname
    }?schema=public&connection_limit=1&pool_timeout=10&connect_timeout=10&max_connections=1`

    return postgresURL
}

export type { APISecrets }
export { FetchSecrets, getConnectionURL }
