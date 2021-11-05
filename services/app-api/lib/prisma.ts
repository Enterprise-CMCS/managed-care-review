import { PrismaClient } from '@prisma/client'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { SecretsManager } from 'aws-sdk'
import { Result, ok, err } from 'neverthrow'

import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'

const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)

const prismaConnect =
    authMode === 'LOCAL' ? prismaClientLocal : prismaClientAurora

export async function NewPrismaClient(): Promise<Result<PrismaClient, Error>> {
    const prismaResult = await prismaConnect()
    if (prismaResult.isErr()) {
        return err(prismaResult.error)
    }
    return ok(prismaResult.value)
}

export async function prismaClientAurora(): Promise<
    Result<PrismaClient, Error>
> {
    try {
        const postgresURL = await GetConnectionURL()
        if (postgresURL.isErr()) {
            return err(postgresURL.error)
        }

        const prismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: postgresURL.value,
                },
            },
        })
        return ok(prismaClient)
    } catch (e) {
        return err(new Error('Could not connect to aurora: ' + e))
    }
}

function prismaClientLocal(): Result<PrismaClient, Error> {
    try {
        return ok(new PrismaClient())
    } catch (e) {
        return err(new Error('Could not connect to local postgres: ' + e))
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

async function getSecretValue(): Promise<Result<Secret, Error>> {
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
        return err(
            new Error(
                'Could not retrieve postgres credentials from secrets manager'
            )
        )
    }

    return ok(secret)
}

export async function GetConnectionURL(): Promise<Result<string, Error>> {
    const secret = await getSecretValue()
    if (secret.isErr()) {
        return err(secret.error)
    }
    const postgresURL = `postgresql://${
        secret.value.username
    }:${encodeURIComponent(secret.value.password)}@${secret.value.host}:${
        secret.value.port
    }/${
        secret.value.dbname
    }?schema=public&connection_limit=5&connect_timeout=60`

    return ok(postgresURL)
}
