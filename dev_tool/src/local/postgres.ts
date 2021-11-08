import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'

export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['yarn', 'prisma', 'generate'],
        'services/app-api'
    )
}

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
            '-d',
            'postgres:13.3',
        ],

        '.'
    )

    await runner.runCommandAndOutput(
        'prisma migrate',
        ['npx', 'prisma', 'migrate', 'dev'],
        'services/app-api'
    )
}
