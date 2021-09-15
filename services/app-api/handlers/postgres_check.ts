import { APIGatewayProxyHandler } from 'aws-lambda'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { PrismaClient } from '@prisma/client'
import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'
import { Result, ok, err } from 'neverthrow'

const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)
const prismaConnect =
    authMode === 'LOCAL' ? prismaClientLocal : prismaClientAurora

export const main: APIGatewayProxyHandler = async () => {
    const prismaResult = await prismaConnect()
    if (prismaResult.isErr()) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'NO_POSTGRES_CONNECTION',
                message: 'Could not connect to Postgres',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
    const prisma = prismaResult.value

    // just do a rando query for now to test this connection out
    // since we don't have a store for this yet
    const result = await prisma.$queryRaw`
        select pid as process_id, 
            usename as username, 
            datname as database_name, 
            application_name,
            backend_start
        from pg_stat_activity;
    `

    return {
        statusCode: 200,
        body: JSON.stringify(result) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

function prismaClientLocal(): Result<PrismaClient, Error> {
    try {
        return ok(new PrismaClient())
    } catch (e) {
        return err(new Error('Could not connect to local postgres: ' + e))
    }
}
async function prismaClientAurora(): Promise<Result<PrismaClient, Error>> {
    try {
        const secret = await getSecretValue()

        const postgresURL = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}?schema=public&connection_limit=5`
        console.log('prismaClientAurora: ' + postgresURL)

        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: postgresURL,
                },
            },
        })
        return ok(prisma)
    } catch (e) {
        return err(new Error('Could not connect to aurora: ' + e))
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

    const secretResponse: GetSecretValueResponse = await secretsManager
        .getSecretValue(params)
        .promise()

    // parse the secrets. we store as a string.
    const secret = JSON.parse(secretResponse.SecretString ?? '') as Secret

    if (!secret.username || !secret.password) {
        throw Error(
            'Could not retreive postgres credentials from secrets manager'
        )
    }

    return secret
}
