import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

// run the graphql compiler with --watch
async function compileGraphQLTypesWatch(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('gql deps', ['yarn', 'install'], '')

    runner.runCommandAndOutput('gqlgen', ['lerna', 'run', 'gqlgen-watch'], '')
}

export const compileGraphQLTypesWatchOnce = once(compileGraphQLTypesWatch)

async function compileGraphQLTypes(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'gql deps',
        ['yarn', 'install', '--prefer-offline'],
        'services/app-graphql'
    )

    return runner.runCommandAndOutput('gqlgen', ['lerna', 'run', 'gqlgen'], '')
}

export const compileGraphQLTypesOnce = once(compileGraphQLTypes)
