import { once } from '../deps.js'
import LabeledProcessRunner from '../runner.js'
import { compileGraphQLTypesOnce } from './graphql.js'
import { compileProto } from './proto.js'

export async function installCommonCodeDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'common code deps',
        ['yarn', 'install'],
        'lib/common-code'
    )
    await compileGraphQLTypesOnce(runner)
    return compileProto(runner)
}

export async function compileCommonCode(runner: LabeledProcessRunner) {
    await installCommonCodeDeps(runner)
    return runner.runCommandAndOutput(
        'common code',
        ['yarn', 'build'],
        'lib/common-code'
    )
}
export const compileCommonCodeOnce = once(compileCommonCode)
