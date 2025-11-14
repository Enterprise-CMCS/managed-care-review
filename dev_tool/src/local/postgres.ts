import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

// prisma generate creates the prisma client based on the current prisma schema
export async function installPrismaDeps(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        'api prisma',
        ['pnpm', 'generate'],
        'services/app-api'
    )
}

// runPostgresLocally is now handled by docker-compose
// This function ensures Postgres is running and runs migrations
export async function runPostgresLocally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    console.info('Starting Postgres via docker-compose...')

    // Start postgres service from docker-compose
    commandMustSucceedSync('docker', ['compose', 'up', '-d', 'postgres'])

    // Wait for Postgres to be ready
    console.info('Waiting for Postgres to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // reset the db, wiping it and running all the migrations files that exist
    // does not db push schema changes into the database
    const migrateResponse = await runner.runCommandAndOutput(
        'prisma reset',
        ['pnpm', '-r', 'prisma:reset'],
        ''
    )

    if (migrateResponse !== 0) {
        console.error(`prisma:reset failed - check migrations file`)
        process.exit()
    }

    console.info('✅ Postgres is ready')
}
