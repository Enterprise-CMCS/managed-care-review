import LabeledProcessRunner from '../runner.js'
import { spawn } from 'child_process'

import {
    compile_graphql_types_watch_once,
    compile_graphql_types_once,
    run_db_locally,
    install_api_deps
 } from '../local/index.js'

export async function run_api_tests_watch(jestArgs: string[], runDB: boolean) {
    const runner = new LabeledProcessRunner()

    compile_graphql_types_watch_once(runner)

    if (runDB) {
        run_db_locally(runner)
    }

    await install_api_deps(runner)

    // because we are inheriting stdio for this process,
    // we need to not run spawnSync or else all the output
    // for the graphql compiler & db will be swallowed.
    const proc = spawn('yarn', ['test'].concat(jestArgs), {
        cwd: 'services/app-api',
        stdio: 'inherit',
    })

    proc.on('close', (code) => {
        process.exit(code ? code : 0)
    })
}

export async function run_api_tests(runner: LabeledProcessRunner): Promise<number> {
    await compile_graphql_types_once(runner)
    await install_api_deps(runner)

    return await runner.run_command_and_output(
        'api - unit',
        ['yarn', 'test:once', '--coverage'],
        'services/app-api'
    )
}
