import { GraphQLClient } from './client/graphqlClient'
import { OAuthClient } from './client/oauthClient'
import { UploadClient } from './client/uploadClient'
import {
    loadEnvironment,
    type SyntheticDataEnvironment,
} from './config/environment'
import { parseContractSmokeSeedInput } from './config/operationInput'
import { SyntheticFetchCurrentUserDocument } from './gen/gqlClient'
import { Logger } from './logger'
import { runContractSmokeScenario } from './scenarios/contractSmoke'

type AuthenticatedClients = {
    graphql: GraphQLClient
    uploads: UploadClient
}

async function createAuthenticatedClients(
    environment: SyntheticDataEnvironment
): Promise<AuthenticatedClients> {
    const retry = {
        maxAttempts: environment.maxAttempts,
        baseDelayMs: environment.retryBaseDelayMs,
    }
    const oauth = new OAuthClient({
        tokenEndpoint: environment.tokenEndpoint,
        clientId: environment.oauthClientId,
        clientSecret: environment.oauthClientSecret,
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
    const { graphql } = await createAuthenticatedClients(environment)
    const result = await graphql.execute(SyntheticFetchCurrentUserDocument, {})

    logger.info('synthetic.preflight.succeeded', {
        actorId: result.fetchCurrentUser.id,
        actorRole: result.fetchCurrentUser.role,
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
    const { graphql, uploads } = await createAuthenticatedClients(environment)

    await runContractSmokeScenario({
        graphql,
        uploads,
        logger,
        seed,
    })
}

const usage =
    'Usage: pnpm cli preflight | pnpm cli seed-contract-smoke --seed <seed>'

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
        const { seed } = parseContractSmokeSeedInput(rest)
        await runSeedContractSmoke(seed)
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
