import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'
import { installPrismaDeps } from './postgres.js'

export async function installAPIDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api deps',
        ['yarn', 'install'],
        'services/app-api'
    )

    // prisma requires that prisma generate is run after any yarn install
    return installPrismaDeps(runner)
}

// runAPILocally uses the serverless-offline plugin to run the api lambdas locally
export async function runAPILocally(runner: LabeledProcessRunner) {
    compileGraphQLTypesWatchOnce(runner)

    await installAPIDeps(runner)

    runner.runCommandAndOutput(
        'api',
        [
            'npx',
            'serverless',
            '--stage',
            'local',
            '--region',
            'us-east-1',
            'offline',
            '--httpPort',
            '3030',
            '--useChildProcesses',
            'start',
        ],
        'services/app-api'
    )
}
