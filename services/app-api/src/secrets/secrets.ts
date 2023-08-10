import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'

interface APISecrets {
    pgConnectionURL: string
}

async function FetchSecrets(
    secretManagerSecret: string
): Promise<Secret | Error> {
    const secretsResult = await getSecretValue(secretManagerSecret)
    if (secretsResult instanceof Error) {
        console.info('Error: Failed to get secrets', secretsResult)
        return new Error('Failed to talk to AWS SecretsManager')
    }
    return secretsResult
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
    const secretResponse: GetSecretValueResponse = await secretsManager.send(
        command
    )

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
    }?schema=public&connection_limit=5&connect_timeout=60&pool_timeout=70`

    return postgresURL
}

export type { APISecrets }
export { FetchSecrets, getConnectionURL }
