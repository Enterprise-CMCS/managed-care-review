import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { SecretsManager } from 'aws-sdk'

import { Result, ok, err } from 'neverthrow'

interface APISecrets {
    pgConnectionURL: string
}

async function FetchSecrets(
    secretManagerSecret: string
): Promise<APISecrets | Error> {
    const secretsResult = await getSecretValue(secretManagerSecret)
    if (secretsResult.isErr()) {
        console.log('Error: Failed to get secrets', secretsResult)
        return new Error('Failed to talk to AWS SecretsManager')
    }

    const pgConnectionURL = getConnectionURL(secretsResult.value)

    return {
        pgConnectionURL,
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
): Promise<Result<Secret, Error>> {
    // lookup secrets manager secret from env
    const params = {
        SecretId: secretManagerSecret,
    }

    // connect to secrets manager and grab the secrets
    const secretsManager = new SecretsManager({
        region: 'us-east-1',
    })

    const secretResponse: GetSecretValueResponse = await secretsManager
        .getSecretValue(params)
        .promise()

    // parse the secrets. we store as a string.
    const secret = JSON.parse(secretResponse.SecretString ?? '') as Secret

    if (!secret.username || !secret.password) {
        console.log('Error: failed to get secrets', secret)
        return err(
            new Error(
                'Could not retrieve postgres credentials from secrets manager'
            )
        )
    }

    return ok(secret)
}

export function getConnectionURL(secrets: Secret): string {
    const postgresURL = `postgresql://${secrets.username}:${encodeURIComponent(
        secrets.password
    )}@${secrets.host}:${secrets.port}/${
        secrets.dbname
    }?schema=public&connection_limit=5&connect_timeout=60&pool_timeout=70`

    return postgresURL
}

export { APISecrets, FetchSecrets }
