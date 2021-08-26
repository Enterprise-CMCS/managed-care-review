import { APIGatewayProxyHandler } from 'aws-lambda'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'

import { PrismaClient } from '@prisma/client'

export const main: APIGatewayProxyHandler = async () => {
    const secret = await getSecretValue()

    const postgresURL = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}?connection_limit=1`

    const prisma = new PrismaClient({
        datasources: { db: { postgresURL } },
    })

    // just do a rando query for now to test this connection out
    // since we don't have a store for this yet
    const result = await prisma.$queryRaw(`
        select pid as process_id, 
            usename as username, 
            datname as database_name, 
            application_name,
            backend_start,
        from pg_stat_activity;
    `)

    return {
        statusCode: 200,
        body: JSON.stringify(result) + '\n',
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
        region: 'us-east-1',
    })

    const secretResponse = await secretsManager.getSecretValue(params).promise()
    const secret = JSON.parse(secretResponse.SecretString!) as Secret

    if (!secret.username || !secret.password) {
        throw Error(
            'Could not retreive postgres credentials from secrets manager'
        )
    }
    return secret
}
