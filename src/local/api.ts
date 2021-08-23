import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'

export async function installAPIDeps(runner: LabeledProcessRunner) {
    return runner.runCommandAndOutput(
        'api deps',
        ['yarn', 'install'],
        'services/app-api'
    )
}

// runAPILocally uses the serverless-offline plugin to run the api lambdas locally
export async function runAPILocally(runner: LabeledProcessRunner) {
    compileGraphQLTypesWatchOnce(runner)

    await installAPIDeps(runner)

    runner.runCommandAndOutput(
        'api',
        [
            'serverless',
            '--stage',
            'local',
            '--region',
            'us-east-1',
            'offline',
            '--httpPort',
            '3030',
            'start',
        ],
        'services/app-api'
    )
}
