import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

// prisma generate creates the prisma client based on the current prisma schema
export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['npx', 'lerna', 'run', 'generate', '--scope=app-api'],
        ''
    )
}

// create a new postgres db.
export async function runPostgresLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    // we use a docker container named mc-postgres
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
        if (line.startsWith('mc-postgres')) {
            // if {{.Status}} starts with "Up" then this container is running.
            if (line.split('\t')[1].startsWith('Up')) {
                // the container is still running.
                console.info(
                    'ERROR: The `mc-postgres` container is still running. In order to run `./dev local postgres` you need to stop it: `docker stop mc-postgres'
                )
                process.exit(1)
            }
            // the old container is not running. We will remove it before starting a fresh one with the same name
            commandMustSucceedSync('docker', ['rm', 'mc-postgres'])
            break
        }
    }

    await runner.runCommandAndOutput(
        'docker postgres',
        [
            'docker',
            'run',
            '--name',
            'mc-postgres',
            '--env',
            'VITE_APP_AUTH_MODE=LOCAL',
            '--env',
            'POSTGRES_PASSWORD=shhhsecret',
            '-p',
            '5432:5432',
            'postgres:13.3',
        ],

        '.',

        // this line is printed basically when things are ready.
        // "ready to accept connections" is repeated so we can't use it.
        { awaitFor: 'listening on IPv6 address' }
    )

    // reset the db, wiping it and running all the migrations files that exist
    // does not db push schema changes into the database
    const migrateResponse = await runner.runCommandAndOutput(
        'prisma reset',
        ['npx', 'lerna', 'run', 'prisma:reset'],
        ''
    )

    if (migrateResponse !== 0) {
        console.error(`prisma:reset failed - check migrations file`)
        process.exit()
    }
}
