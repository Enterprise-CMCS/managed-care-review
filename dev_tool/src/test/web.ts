import LabeledProcessRunner from '../runner.js'
import { spawn } from 'child_process'

import {
    compileGraphQLTypesWatchOnce,
    compileGraphQLTypesOnce,
    installWebDepsOnce,
    compileProto,
    compileProtoWatch,
} from '../local/index.js'

export async function runWebTestsWatch(jestArgs: string[]) {
    const runner = new LabeledProcessRunner()

    await compileGraphQLTypesWatchOnce(runner)
    await compileProtoWatch(runner)

    await installWebDepsOnce(runner)

    // because we are inheriting stdio for this process,
    // we need to not run spawnSync or else all the output
    // for the graphql compiler will be swallowed.
    const proc = spawn('pnpm', ['test'].concat(jestArgs), {
        cwd: 'services/app-web',
        stdio: 'inherit',
    })

    proc.on('close', (code) => {
        process.exit(code ? code : 0)
    })
}

export async function runWebTests(
    runner: LabeledProcessRunner
): Promise<number> {
    await compileGraphQLTypesOnce(runner)
    await compileProto(runner)
    await installWebDepsOnce(runner)

    return await runner.runCommandAndOutput(
        'web - unit',
        ['pnpm', 'test:coverage'],
        'services/app-web'
    )
}
