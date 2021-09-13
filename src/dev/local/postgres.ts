import LabeledProcessRunner from '../runner.js'

export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['yarn', 'prisma', 'generate'],
        'services/app-api'
    )
}

export async function runPostgresLocally(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'postgres',
        ['docker-compose', 'up', '-d'],
        '.'
    )

    runner.runCommandAndOutput(
        'postgres migrate',
        ['npx', 'prisma', 'migrate', 'dev'],
        'services/app-api'
    )
}
