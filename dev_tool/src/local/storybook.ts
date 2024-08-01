import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'
import { installWebDepsOnce } from './web.js'

export async function runStorybookLocally(runner: LabeledProcessRunner) {
    compileGraphQLTypesWatchOnce(runner)

    await installWebDepsOnce(runner)

    runner.runCommandAndOutput(
        'storybook',
        ['npx', 'lerna', 'run', 'storybook:run'],
        ''
    )
}
