import LabeledProcessRunner from '../runner.js'
import { compile_graphql_types_watch_once } from './graphql.js'
import { install_web_deps_once } from './web.js'


export async function run_sb_locally(runner: LabeledProcessRunner) {
    compile_graphql_types_watch_once(runner)

    await install_web_deps_once(runner)

    runner.run_command_and_output(
        'storybook',
        ['yarn', 'storybook'],
        'services/app-web'
    )
}
