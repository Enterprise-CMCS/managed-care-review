import { requireBinary } from '../deps.js'
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

    await runner.runCommandAndOutput(
        'proto deps',
        ['yarn', 'install'],
        'services/app-proto'
    )

    runner.runCommandAndOutput(
        'protogen',
        ['yarn', 'protogen:watch'],
        'services/app-proto'
    )
}

export async function compileProto(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'proto deps',
        ['yarn', 'install', '--prefer-offline'],
        'services/app-proto'
    )

    return runner.runCommandAndOutput(
        'protogen',
        ['yarn', 'protogen'],
        'services/app-proto'
    )
}
