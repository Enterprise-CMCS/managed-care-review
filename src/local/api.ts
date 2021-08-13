import LabeledProcessRunner from '../runner.js'
import { compile_graphql_types_watch_once } from './graphql.js'

export async function install_api_deps(runner: LabeledProcessRunner) {
    return runner.run_command_and_output(
        'api deps',
        ['yarn', 'install'],
        'services/app-api'
    )
}

// run_api_locally uses the serverless-offline plugin to run the api lambdas locally
export async function run_api_locally(runner: LabeledProcessRunner) {
    compile_graphql_types_watch_once(runner)

    await install_api_deps(runner)

    runner.run_command_and_output(
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
