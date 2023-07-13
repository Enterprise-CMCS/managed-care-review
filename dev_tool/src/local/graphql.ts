import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

// run the graphql compiler with --watch
async function compileGraphQLTypesWatch(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('gql deps', ['yarn', 'install'], '')

    runner.runCommandAndOutput(
        'gqlgen',
        ['yarn', 'gqlgen:watch'],
        'services/app-graphql'
    )
}

export const compileGraphQLTypesWatchOnce = once(compileGraphQLTypesWatch)

async function compileGraphQLTypes(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('gql deps', ['yarn', 'install'], '')

    return runner.runCommandAndOutput(
        'gqlgen',
        ['yarn', 'gqlgen'],
        'services/app-graphql'
    )
}

export const compileGraphQLTypesOnce = once(compileGraphQLTypes)
