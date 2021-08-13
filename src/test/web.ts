import LabeledProcessRunner from '../runner.js'
import { spawn } from 'child_process'

import {
    compile_graphql_types_watch_once,
    compile_graphql_types_once,
    install_web_deps_once
} from '../local/index.js'

export async function run_web_tests_watch(jestArgs: string[]) {
    const runner = new LabeledProcessRunner()

    compile_graphql_types_watch_once(runner)

    await install_web_deps_once(runner)

    // because we are inheriting stdio for this process,
    // we need to not run spawnSync or else all the output
    // for the graphql compiler will be swallowed.
    const proc = spawn('yarn', ['test'].concat(jestArgs), {
        cwd: 'services/app-web',
        stdio: 'inherit',
    })

    proc.on('close', (code) => {
        process.exit(code ? code : 0)
    })
}

export async function run_web_tests(runner: LabeledProcessRunner): Promise<number> {
    await compile_graphql_types_once(runner)
    await install_web_deps_once(runner)

    return await runner.run_command_and_output(
        'web - unit',
        ['yarn', 'test:once', '--coverage'],
        'services/app-web'
    )
}
