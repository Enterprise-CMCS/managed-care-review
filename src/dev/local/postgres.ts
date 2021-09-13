import LabeledProcessRunner from '../runner.js'

export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['yarn', 'prisma', 'generate'],
        'services/app-api'
    )
}
