import { once, requireBinary } from '../deps.js'
import LabeledProcessRunner from '../runner.js'

// run the proto compiler with --watch
export async function compileProtoWatch(runner: LabeledProcessRunner) {
    requireBinary(
        ['which', 'entr'],
        "`entr` is required to compile our protobufs and watch. You should be able to get it with `brew install entr`. It's great."
    )

    requireBinary(
        ['which', 'protolint'],
        '`protolint` is used on pre-commit to check your .proto files. Please refer to the README for installation instructions.'
    )

    await runner.runCommandAndOutput('proto deps', ['pnpm', 'install'], '')

    return await runner.runCommandAndOutput(
        'protogen',
        ['npx', 'lerna', 'run', 'generate:watch', '--scope=app-proto'],
        ''
    )
}

export const compileProtoWatchOnce = once(compileProtoWatch)

export async function compileProto(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'proto deps',
        ['pnpm', 'install', '--prefer-offline'],
        ''
    )

    return runner.runCommandAndOutput(
        'protogen',
        ['npx', 'lerna', 'run', 'generate', '--scope=app-proto'],
        ''
    )
}
