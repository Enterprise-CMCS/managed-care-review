import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

export async function runOtelLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()
    const psOut = commandMustSucceedSync('docker', [
        'ps',
        '-a',
        '--format',
        '{{ .Names }}\t{{ .Status }}',
    ])

    for (const line of psOut.split('\n')) {
        const [name, status] = line.split('\t')
        if (
            name.startsWith('managed-care-review-otel-collector') &&
            status.startsWith('Up')
        ) {
            console.log(
                'ERROR: An instance of otel-collector is already running. In order to run `./dev local otel` you must first stop the instance.'
            )
        }
        commandMustSucceedSync('docker', [
            'compose',
            'down',
            '--remove-orphans',
        ])
    }

    await runner.runCommandAndOutput(
        'docker otel',
        ['docker', 'compose', 'up'],

        '.',

        // this line is printed basically when things are ready.
        // "ready to accept connections" is repeated so we can't use it.
        { awaitFor: 'Everything is ready. Begin running and processing data.' }
    )
}
