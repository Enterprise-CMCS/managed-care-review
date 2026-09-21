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

export type SyntheticActorKind = 'state' | 'cms'

export type SyntheticDataCredentials = {
    clientId: string
    clientSecret: string
}

type BootstrappedSyntheticActor = {
    userId: string
    clientId: string
}

export type BootstrapSyntheticDataResponse = {
    success: true
    stage: string
    actors: Record<SyntheticActorKind, BootstrappedSyntheticActor>
}

function expectedClientId(stage: string, actor: SyntheticActorKind): string {
    return `synthetic-data-${stage}-${actor}`
}

export function validateSyntheticDataCredentials(
    value: unknown,
    stage: string,
    actor: SyntheticActorKind
): SyntheticDataCredentials {
    if (!value || typeof value !== 'object') {
        throw new Error('Synthetic data credentials secret is invalid')
    }

    const clientId = Reflect.get(value, 'clientId')
    const clientSecret = Reflect.get(value, 'clientSecret')

    if (
        clientId !== expectedClientId(stage, actor) ||
        typeof clientSecret !== 'string' ||
        clientSecret.length < 32
    ) {
        throw new Error('Synthetic data credentials secret is invalid')
    }

    return { clientId, clientSecret }
}

async function loadSyntheticDataCredentials(
    secretId: string,
    stage: string,
    actor: SyntheticActorKind
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

    return validateSyntheticDataCredentials(parsed, stage, actor)
}

async function upsertSyntheticActor(
    prismaClient: ExtendedPrismaClient,
    stage: string,
    actor: SyntheticActorKind,
    credentials: SyntheticDataCredentials
): Promise<BootstrappedSyntheticActor> {
    const isStateActor = actor === 'state'
    const userId = `synthetic-data-${stage}-${actor}-user`
    const user = {
        givenName: 'Synthetic',
        familyName: isStateActor ? 'Data' : 'CMS',
        email: isStateActor
            ? `synthetic-data-${stage}@example.com`
            : `synthetic-data-${stage}-cms@example.com`,
        role: isStateActor ? ('STATE_USER' as const) : ('CMS_USER' as const),
        stateCode: isStateActor ? 'MN' : null,
    }

    await prismaClient.user.upsert({
        where: { id: userId },
        create: {
            id: userId,
            ...user,
        },
        update: user,
    })

    await prismaClient.oAuthClient.upsert({
        where: { clientId: credentials.clientId },
        create: {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            grants: ['client_credentials'],
            description: `Synthetic data ${actor} client for ${stage}`,
            userID: userId,
            scopes: [OAuthScope.SYNTHETIC_DATA_WRITE],
        },
        update: {
            clientSecret: credentials.clientSecret,
            grants: ['client_credentials'],
            description: `Synthetic data ${actor} client for ${stage}`,
            userID: userId,
            scopes: [OAuthScope.SYNTHETIC_DATA_WRITE],
        },
    })

    return {
        userId,
        clientId: credentials.clientId,
    }
}

export async function bootstrapSyntheticActors(
    prismaClient: ExtendedPrismaClient,
    stage: string,
    credentials: Record<SyntheticActorKind, SyntheticDataCredentials>
): Promise<BootstrapSyntheticDataResponse> {
    const [state, cms] = await Promise.all([
        upsertSyntheticActor(prismaClient, stage, 'state', credentials.state),
        upsertSyntheticActor(prismaClient, stage, 'cms', credentials.cms),
    ])

    return {
        success: true,
        stage,
        actors: { state, cms },
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

    const stateSecretId = process.env.SYNTHETIC_DATA_STATE_CREDENTIALS_SECRET
    const cmsSecretId = process.env.SYNTHETIC_DATA_CMS_CREDENTIALS_SECRET
    const databaseUrl = process.env.DATABASE_URL
    if (!stateSecretId || !cmsSecretId || !databaseUrl) {
        throw new Error('Synthetic data bootstrap configuration is incomplete')
    }

    const [stateCredentials, cmsCredentials] = await Promise.all([
        loadSyntheticDataCredentials(stateSecretId, stage, 'state'),
        loadSyntheticDataCredentials(cmsSecretId, stage, 'cms'),
    ])
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

    return bootstrapSyntheticActors(prismaClient, stage, {
        state: stateCredentials,
        cms: cmsCredentials,
    })
}
