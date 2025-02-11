import { once } from '../deps.js'
import LabeledProcessRunner from '../runner.js'

export function watchPackages(runner: LabeledProcessRunner) {
    return runner.runCommandAndOutput(
        'watch packages',
        ['pnpm', 'packages:watch'],
        ''
    )
}

export const watchPackagesOnce = once(watchPackages)
