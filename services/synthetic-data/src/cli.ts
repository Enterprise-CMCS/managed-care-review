import { GraphQLClient } from './client/graphqlClient'
import { OAuthClient } from './client/oauthClient'
import { loadEnvironment } from './config/environment'
import { SyntheticFetchCurrentUserDocument } from './gen/gqlClient'
import { Logger } from './logger'

async function runPreflight(): Promise<void> {
    const environment = loadEnvironment()
    const logger = new Logger({
        base: {
            environment: environment.stage,
            operation: 'preflight',
        },
    })
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

    logger.info('synthetic.preflight.started')
    const token = await oauth.requestToken()
    const graphql = new GraphQLClient({
        endpoint: environment.graphqlEndpoint,
        accessToken: () => token.accessToken,
        retry,
    })
    const result = await graphql.execute(SyntheticFetchCurrentUserDocument, {})

    logger.info('synthetic.preflight.succeeded', {
        actorId: result.fetchCurrentUser.id,
        actorRole: result.fetchCurrentUser.role,
    })
}

async function main(): Promise<void> {
    const [command, ...rest] = process.argv.slice(2)
    if (command !== 'preflight' || rest.length > 0) {
        throw new Error('Usage: pnpm cli preflight')
    }

    await runPreflight()
}

main().catch((error: unknown) => {
    new Logger({ base: { operation: 'preflight' } }).error(
        'synthetic.preflight.failed',
        error
    )
    process.exitCode = 1
})
