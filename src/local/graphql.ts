import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

// run the graphql compiler with --watch
async function compile_graphql_types_watch(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'gql deps',
        ['yarn', 'install'],
        'services/app-graphql'
    )

    return runner.run_command_and_output(
        'gqlgen',
        ['yarn', 'gqlgen', '--watch'],
        'services/app-graphql'
    )
}

export const compile_graphql_types_watch_once = once(compile_graphql_types_watch)

async function compile_graphql_types(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'gql deps',
        ['yarn', 'install'],
        'services/app-graphql'
    )

    return runner.run_command_and_output(
        'gqlgen',
        ['yarn', 'gqlgen'],
        'services/app-graphql'
    )
}

export const compile_graphql_types_once = once(compile_graphql_types)
