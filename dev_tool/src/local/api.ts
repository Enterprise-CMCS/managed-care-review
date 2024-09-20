/* eslint-disable @typescript-eslint/no-floating-promises */
import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'
import { installPrismaDeps } from './postgres.js'
import { compileProtoWatchOnce } from './proto.js'

export async function installAPIDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('api deps', ['pnpm', 'install'], '')

    // prisma requires that prisma generate is run after any pnpm install
    return installPrismaDeps(runner)
}

// runAPILocally uses the serverless-offline plugin to run the api lambdas locally
export async function runAPILocally(
    runner: LabeledProcessRunner,
    withProf = false
) {
    compileGraphQLTypesWatchOnce(runner)
    compileProtoWatchOnce(runner)

    await installAPIDeps(runner)

    if (!withProf) {
        await runner.runCommandAndOutput(
            'api',
            ['pnpm', 'start'],
            'services/app-api'
        )
    } else {
        // this is a copy of the pnpm start command, we have to invoke node directly so it's possible this will get out of sync.
        await runner.runCommandAndOutput(
            'api',
            [
                'node',
                '--prof',
                '--enable-source-maps',
                'node_modules/serverless/bin/serverless.js',
                'offline',
                'start',
                '--stage',
                'local',
                '--region',
                'us-east-1',
                '--httpPort',
                '3030',
                '--host',
                '127.0.0.1',
            ],
            'services/app-api'
        )
    }
}
