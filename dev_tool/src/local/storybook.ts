import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesWatchOnce } from './graphql.js'

export async function runStorybookLocally(runner: LabeledProcessRunner) {
    compileGraphQLTypesWatchOnce(runner)

    runner.runCommandAndOutput('storybook', ['lerna', 'run', 'storybook'], '')
}
