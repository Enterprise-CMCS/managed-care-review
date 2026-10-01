import { GraphQLClient } from './client/graphqlClient'
import { OAuthClient } from './client/oauthClient'
import { UploadClient } from './client/uploadClient'
import {
    loadEnvironment,
    type SyntheticDataEnvironment,
} from './config/environment'
import { parseScenarioSeedInput } from './config/operationInput'
import { SyntheticFetchCurrentUserDocument } from './gen/gqlClient'
import { Logger } from './logger'
import { runContractSmokeScenario } from './scenarios/contractSmoke'
import { runContractLinkedRateScenario } from './scenarios/contractLinkedRate'
import { runContractUnlockResubmitScenario } from './scenarios/contractUnlockResubmit'

type AuthenticatedClients = {
    graphql: GraphQLClient
    uploads: UploadClient
}

async function createAuthenticatedClients(
    environment: SyntheticDataEnvironment,
    actor: 'state' | 'cms'
): Promise<AuthenticatedClients> {
    const retry = {
        maxAttempts: environment.maxAttempts,
        baseDelayMs: environment.retryBaseDelayMs,
    }
    const clientId =
        actor === 'state'
            ? environment.stateOAuthClientId
            : environment.cmsOAuthClientId
    const clientSecret =
        actor === 'state'
            ? environment.stateOAuthClientSecret
            : environment.cmsOAuthClientSecret
    const oauth = new OAuthClient({
        tokenEndpoint: environment.tokenEndpoint,
        clientId,
        clientSecret,
        retry,
    })
    const token = await oauth.requestToken()
    const graphql = new GraphQLClient({
        endpoint: environment.graphqlEndpoint,
        accessToken: () => token.accessToken,
        retry,
    })

    return {
        graphql,
        uploads: new UploadClient({ graphql, retry }),
    }
}

export async function runPreflight(): Promise<void> {
    const environment = loadEnvironment()
    const logger = new Logger({
        base: {
            environment: environment.stage,
            operation: 'preflight',
        },
    })

    logger.info('synthetic.preflight.started')
    const [stateClients, cmsClients] = await Promise.all([
        createAuthenticatedClients(environment, 'state'),
        createAuthenticatedClients(environment, 'cms'),
    ])
    const [stateResult, cmsResult] = await Promise.all([
        stateClients.graphql.execute(SyntheticFetchCurrentUserDocument, {}),
        cmsClients.graphql.execute(SyntheticFetchCurrentUserDocument, {}),
    ])
    if (
        stateResult.fetchCurrentUser.role !== 'STATE_USER' ||
        cmsResult.fetchCurrentUser.role !== 'CMS_USER'
    ) {
        throw new Error('Synthetic actor preflight returned unexpected roles')
    }

    logger.info('synthetic.preflight.succeeded', {
        stateActorId: stateResult.fetchCurrentUser.id,
        stateActorRole: stateResult.fetchCurrentUser.role,
        cmsActorId: cmsResult.fetchCurrentUser.id,
        cmsActorRole: cmsResult.fetchCurrentUser.role,
    })
}

export async function runSeedContractSmoke(seed: string): Promise<void> {
    const environment = loadEnvironment()
    const logger = new Logger({
        base: {
            environment: environment.stage,
            operation: 'seed-contract-smoke',
        },
    })
    const { graphql, uploads } = await createAuthenticatedClients(
        environment,
        'state'
    )

    await runContractSmokeScenario({
        graphql,
        uploads,
        logger,
        seed,
    })
}

export async function runSeedContractLinkedRate(seed: string): Promise<void> {
    const environment = loadEnvironment()
    const logger = new Logger({
        base: {
            environment: environment.stage,
            operation: 'seed-contract-linked-rate',
        },
    })
    const { graphql, uploads } = await createAuthenticatedClients(
        environment,
        'state'
    )

    await runContractLinkedRateScenario({
        graphql,
        uploads,
        logger,
        seed,
    })
}

const usage = [
    'Usage: pnpm cli preflight',
    'pnpm cli seed-contract-smoke --seed <seed>',
    'pnpm cli seed-contract-linked-rate --seed <seed>',
    'pnpm cli seed-contract-unlock-resubmit --seed <seed>',
].join(' | ')

export async function runSeedContractUnlockResubmit(
    seed: string
): Promise<void> {
    const environment = loadEnvironment()
    const logger = new Logger({
        base: {
            environment: environment.stage,
            operation: 'seed-contract-unlock-resubmit',
        },
    })
    const [stateClients, cmsClients] = await Promise.all([
        createAuthenticatedClients(environment, 'state'),
        createAuthenticatedClients(environment, 'cms'),
    ])

    await runContractUnlockResubmitScenario({
        stateGraphql: stateClients.graphql,
        cmsGraphql: cmsClients.graphql,
        uploads: stateClients.uploads,
        logger,
        seed,
    })
}

export async function main(args = process.argv.slice(2)): Promise<void> {
    const [command, ...rest] = args
    if ((command === '--help' || command === '-h') && rest.length === 0) {
        console.info(usage)
        return
    }

    if (command === 'preflight' && rest.length === 0) {
        await runPreflight()
        return
    }

    if (command === 'seed-contract-smoke') {
        const { seed } = parseScenarioSeedInput(rest)
        await runSeedContractSmoke(seed)
        return
    }

    if (command === 'seed-contract-linked-rate') {
        const { seed } = parseScenarioSeedInput(rest)
        await runSeedContractLinkedRate(seed)
        return
    }

    if (command === 'seed-contract-unlock-resubmit') {
        const { seed } = parseScenarioSeedInput(rest)
        await runSeedContractUnlockResubmit(seed)
        return
    }

    throw new Error(usage)
}

main().catch((error: unknown) => {
    new Logger({ base: { operation: 'cli' } }).error(
        'synthetic.cli.failed',
        error
    )
    process.exitCode = 1
})
