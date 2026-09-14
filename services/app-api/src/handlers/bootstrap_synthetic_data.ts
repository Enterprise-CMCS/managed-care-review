import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import type { Handler } from 'aws-lambda'
import { OAuthScope } from '../generated/client'
import {
    NewPrismaClient,
    type ExtendedPrismaClient,
} from '../postgres/prismaClient'
import { assertSyntheticDataEnvironment } from '../syntheticData/safety'
import { getPostgresURL } from './configuration'

const secretsManager = new SecretsManagerClient({})
const confirmation = 'BOOTSTRAP_SYNTHETIC_DATA'

export type BootstrapSyntheticDataEvent = {
    stage?: string
    confirmation?: string
}

export type SyntheticDataCredentials = {
    clientId: string
    clientSecret: string
}

export type BootstrapSyntheticDataResponse = {
    success: true
    stage: string
    userId: string
    clientId: string
}

function expectedClientId(stage: string): string {
    return `synthetic-data-${stage}-state`
}

export function validateSyntheticDataCredentials(
    value: unknown,
    stage: string
): SyntheticDataCredentials {
    if (!value || typeof value !== 'object') {
        throw new Error('Synthetic data credentials secret is invalid')
    }

    const clientId = Reflect.get(value, 'clientId')
    const clientSecret = Reflect.get(value, 'clientSecret')

    if (
        clientId !== expectedClientId(stage) ||
        typeof clientSecret !== 'string' ||
        clientSecret.length < 32
    ) {
        throw new Error('Synthetic data credentials secret is invalid')
    }

    return { clientId, clientSecret }
}

async function loadSyntheticDataCredentials(
    secretId: string,
    stage: string
): Promise<SyntheticDataCredentials> {
    const result = await secretsManager.send(
        new GetSecretValueCommand({ SecretId: secretId })
    )

    if (!result.SecretString) {
        throw new Error('Synthetic data credentials secret has no string value')
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(result.SecretString)
    } catch {
        throw new Error('Synthetic data credentials secret is not valid JSON')
    }

    return validateSyntheticDataCredentials(parsed, stage)
}

export async function bootstrapSyntheticActor(
    prismaClient: ExtendedPrismaClient,
    stage: string,
    credentials: SyntheticDataCredentials
): Promise<BootstrapSyntheticDataResponse> {
    const userId = `synthetic-data-${stage}-state-user`
    const email = `synthetic-data-${stage}@example.com`

    await prismaClient.user.upsert({
        where: { id: userId },
        create: {
            id: userId,
            givenName: 'Synthetic',
            familyName: 'Data',
            email,
            role: 'STATE_USER',
            stateCode: 'MN',
        },
        update: {
            givenName: 'Synthetic',
            familyName: 'Data',
            email,
            role: 'STATE_USER',
            stateCode: 'MN',
        },
    })

    await prismaClient.oAuthClient.upsert({
        where: { clientId: credentials.clientId },
        create: {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            grants: ['client_credentials'],
            description: `Synthetic data client for ${stage}`,
            userID: userId,
            scopes: [OAuthScope.SYNTHETIC_DATA_WRITE],
        },
        update: {
            clientSecret: credentials.clientSecret,
            grants: ['client_credentials'],
            description: `Synthetic data client for ${stage}`,
            userID: userId,
            scopes: [OAuthScope.SYNTHETIC_DATA_WRITE],
        },
    })

    return {
        success: true,
        stage,
        userId,
        clientId: credentials.clientId,
    }
}

export const main: Handler<
    BootstrapSyntheticDataEvent,
    BootstrapSyntheticDataResponse
> = async (event) => {
    const stage = event.stage
    if (!stage || event.confirmation !== confirmation) {
        throw new Error('Synthetic data bootstrap confirmation is invalid')
    }

    assertSyntheticDataEnvironment(stage)

    const secretId = process.env.SYNTHETIC_DATA_CREDENTIALS_SECRET
    const databaseUrl = process.env.DATABASE_URL
    if (!secretId || !databaseUrl) {
        throw new Error('Synthetic data bootstrap configuration is incomplete')
    }

    const credentials = await loadSyntheticDataCredentials(secretId, stage)
    const databaseConnection = await getPostgresURL(
        databaseUrl,
        process.env.SECRETS_MANAGER_SECRET
    )
    if (databaseConnection instanceof Error) {
        throw new Error(
            `Init Error: failed to get pg URL: ${databaseConnection.message}`
        )
    }

    const prismaClient = await NewPrismaClient(databaseConnection)
    if (prismaClient instanceof Error) {
        throw new Error(
            `Init Error: failed to create Prisma client: ${prismaClient.message}`
        )
    }

    return bootstrapSyntheticActor(prismaClient, stage, credentials)
}
