import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'
import { command } from 'yargs'

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

// Attempt without docker compose. Network is failing between frontend and containers:
/*
export async function runOtelLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()
    // if that container is running, we exit 1
    // if that container is stopped but exists, we remove it before re-creating it
    // you can always run your old db container yourself and skip running ./dev local postgres
    const psOut = commandMustSucceedSync('docker', [
        'ps',
        '-a',
        '--format',
        '{{ .Names }}\t{{ .Status }}',
    ])

    for (const line of psOut.split('\n')) {
        if (line.startsWith('mc-jaeger')) {
            // if {{.Status}} starts with "Up" then this container is running.
            if (line.split('\t')[1].startsWith('Up')) {
                // the container is still running.
                console.log(
                    'ERROR: The `mc-jaeger` container is still running. In order to run `./dev local otel` you need to stop it: `docker stop mc-jaeger'
                )
                process.exit(1)
            }
            // the old container is not running. We will remove it before starting a fresh one with the same name
            commandMustSucceedSync('docker', ['rm', 'mc-jaeger'])
            break
        }

        if (line.startsWith('mc-otel')) {
            if (line.split('\t')[1].startsWith('Up')) {
                // the container is still running.
                console.log(
                    'ERROR: The `mc-otel` container is still running. In order to run `./dev local otel` you need to stop it: `docker stop mc-otel'
                )
                process.exit(1)
            }
            // the old container is not running. We will remove it before starting a fresh one with the same name
            commandMustSucceedSync('docker', ['rm', 'mc-otel'])
            break
        }
    }

    const networkCheck = commandMustSucceedSync('docker', ['network', 'ls'])

    for (const line of networkCheck.split('\n')) {
        if (line.startsWith('mc-review')) {
            console.log(
                'ERROR: The `mc-review` network is still running. In order to run `./dev local otel` you need to stop it: `docker network rm mc-review'
            )
            commandMustSucceedSync('docker', ['network', 'rm', 'mc-review'])
            break
        }
    }

    await runner.runCommandAndOutput(
        'docker create network',
        ['docker', 'network', 'create', 'mc-review'],
        '.'
    )

    await runner.runCommandAndOutput(
        'docker jaeger',
        [
            'docker',
            'run',
            '--name',
            'mc-jaeger',
            '--net',
            'mc-review',
            '-p',
            '16686:16686',
            '-p',
            '14250:14250',
            '-p',
            '14268',
            'jaegertracing/all-in-one:latest',
        ],

        '.',

        // this line is printed basically when things are ready.
        // "ready to accept connections" is repeated so we can't use it.
        { awaitFor: 'Channel Connectivity change to READY' }
    )

    await runner.runCommandAndOutput(
        'docker otel',
        [
            'docker',
            'run',
            '--name',
            'mc-otel',
            '-v',
            `${process.env.PWD}/otel-collector-config.yml:/etc/otel-collector.yml`,
            '--net',
            'mc-review',
            '-p',
            '4317:4317',
            '-p',
            '4318:4318',
            '-p',
            '55680:55680',
            'otel/opentelemetry-collector:latest',
            '--config',
            '/etc/otel-collector.yml',
        ],
        '.',
        { awaitFor: 'Everything is ready. Begin running and processing data.' }
    )
}
*/
