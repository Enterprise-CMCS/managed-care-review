import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

export async function runOtelLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    console.info('Starting Jaeger (OTEL collector) via docker-compose...')

    // Start Jaeger service from docker-compose
    commandMustSucceedSync('docker', [
        'compose',
        'up',
        '-d',
        'jaeger-all-in-one',
    ])

    console.info('✅ Jaeger is ready')
    console.info('   UI: http://localhost:16686')
}
