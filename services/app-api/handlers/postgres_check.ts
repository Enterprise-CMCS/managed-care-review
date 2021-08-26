import { APIGatewayProxyHandler } from 'aws-lambda'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'

export const main: APIGatewayProxyHandler = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify('postgres db connection success') + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
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

async function getSecretValue(): Promise<Secret> {
    // lookup secrets manager secret from env
    const params = {
        SecretId: process.env.SECRETS_MANAGER_SECRET || 'no secret set',
    }

    // connect to secrets manager and grab the secrets
    const secretsManager = new SecretsManager({
        region: 'REGION',
    })
    let secretResponse: GetSecretValueResponse

    secretResponse = await secretsManager.getSecretValue(params).promise()
    const secret = JSON.parse(secretResponse.SecretString!) as Secret

    if (!secret.username || !secret.password) {
        throw Error(
            'Could not retreive postgres credentials from secrets manager'
        )
    }
    return secret
}
