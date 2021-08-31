import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'

async function installPrismaDeps(runner: LabeledProcessRunner) {
    return runner.runCommandAndOutput(
        'api prisma',
        ['yarn', 'prisma', 'generate'],
        'services/app-api'
    )
}

export const installPrismaDepsOnce = once(installPrismaDeps)
