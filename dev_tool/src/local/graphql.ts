import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

// run the graphql compiler with --watch
async function compileGraphQLTypesWatch(runner: LabeledProcessRunner) {
    runner.runCommandAndOutput(
        'gqlgen',
        ['npx', 'lerna', 'run', 'gqlgen:watch'],
        ''
    )
}

export const compileGraphQLTypesWatchOnce = once(compileGraphQLTypesWatch)

async function compileGraphQLTypes(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'gql deps',
        ['yarn', 'install', '--prefer-offline'],
        ''
    )

    return runner.runCommandAndOutput(
        'gqlgen',
        ['npx', 'lerna', 'run', 'gqlgen'],
        ''
    )
}

export const compileGraphQLTypesOnce = once(compileGraphQLTypes)
