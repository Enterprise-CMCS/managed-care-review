import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'

// prisma generate creates the prisma client based on the current prisma schema
export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['yarn', 'prisma', 'generate'],
        'services/app-api'
    )
}

// create a new postgres db.
export async function runPostgresLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    await runner.runCommandAndOutput(
        'docker postgres',
        [
            'docker',
            'run',
            '--name',
            'mc-postgres',
            '--env',
            'REACT_APP_AUTH_MODE=LOCAL',
            '--env',
            'POSTGRES_PASSWORD=shhhsecret',
            '-p',
            '5432:5432',
            '--rm',
            'postgres:13.3',
        ],

        '.',

        // this line is printed basically when things are ready.
        // "ready to accept connections" is repeated so we can't use it.
        { awaitFor: 'listening on IPv6 address' }
    )

    // reset the db, wiping it and running all the migrations files that exist
    // does not db push schema changes into the database
    await runner.runCommandAndOutput(
        'prisma reset',
        ['npx', 'prisma', 'migrate', 'reset', '--force'],
        'services/app-api'
    )
}
