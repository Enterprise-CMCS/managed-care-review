import LabeledProcessRunner from '../runner.js'

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

    return await runner.runCommandAndOutput(
        'web - unit',
        ['lerna', 'run', 'test', '--scope=app-web'],
        ''
    )
}

export async function runWebTests(
    runner: LabeledProcessRunner
): Promise<number> {
    await compileGraphQLTypesOnce(runner)
    await compileProto(runner)
    await installWebDepsOnce(runner)

    return await runner.runCommandAndOutput(
        'web - unit',
        ['lerna', 'run', 'test:once', '--scope=app-web'],
        ''
    )
}
