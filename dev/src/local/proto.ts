import LabeledProcessRunner from '../runner.js'
import { requireBinary } from '../deps.js'

// run the graphql compiler with --watch
export async function compileProtoWatch(runner: LabeledProcessRunner) {
    requireBinary(
        ['which', 'entr'],
        "`entr` is required to compile our protobufs and watch. You should be able to get it with `brew install entr`. It's great."
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
        ['yarn', 'install'],
        'services/app-proto'
    )

    return runner.runCommandAndOutput(
        'protogen',
        ['yarn', 'protogen'],
        'services/app-proto'
    )
}
