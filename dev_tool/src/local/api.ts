import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'
import { watchPackagesOnce } from './packages.js'
import { installPrismaDeps } from './postgres.js'
import { compileProtoWatchOnce } from './proto.js'

export async function installAPIDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('api deps', ['pnpm', 'install'], '')
    await runner.runCommandAndOutput(
        'build packages',
        ['pnpm', 'build:packages'],
        ''
    )
    //Ensures we watch files in the packages directory for any changes to trigger build:packages
    watchPackagesOnce(runner)
    // prisma requires that prisma generate is run after any pnpm install
    return installPrismaDeps(runner)
}

// runAPILocally runs the API using our custom Express server (replaces serverless-offline)
export async function runAPILocally(
    runner: LabeledProcessRunner,
    withProf = false
) {
    compileGraphQLTypesWatchOnce(runner)
    compileProtoWatchOnce(runner)

    await installAPIDeps(runner)

    // Build the local server first
    await runner.runCommandAndOutput(
        'build local server',
        ['pnpm', 'build:local'],
        'services/app-api'
    )

    if (!withProf) {
        // Run with nodemon for hot reload (watches src/, rebuilds with esbuild, restarts)
        await runner.runCommandAndOutput(
            'api',
            ['pnpm', 'exec', 'nodemon'],
            'services/app-api'
        )
    } else {
        // Run with Node profiling enabled
        await runner.runCommandAndOutput(
            'api',
            [
                'node',
                '--prof',
                '--enable-source-maps',
                '.local-build/local-server.js',
            ],
            'services/app-api'
        )
    }
}
