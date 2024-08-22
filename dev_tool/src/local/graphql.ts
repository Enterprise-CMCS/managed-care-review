import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

// run the graphql compiler with --watch
async function compileGraphQLTypesWatch(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('gql deps', ['pnpm', 'install'], '')

    return await runner.runCommandAndOutput(
        'gqlgen',
        ['pnpm', '-r', 'gqlgen:watch'],
        ''
    )
}

export const compileGraphQLTypesWatchOnce = once(compileGraphQLTypesWatch)

async function compileGraphQLTypes(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'gql deps',
        ['pnpm', 'install', '--prefer--offline'],
        ''
    )

    return runner.runCommandAndOutput('gqlgen', ['pnpm', '-r', 'gqlgen'], '')
}

export const compileGraphQLTypesOnce = once(compileGraphQLTypes)
