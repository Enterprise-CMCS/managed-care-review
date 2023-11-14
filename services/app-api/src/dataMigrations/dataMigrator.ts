import { PrismaClient } from '@prisma/client'
import type { PrismaTransactionType } from '../postgres/prismaTypes'
import { migrate as migrate1 } from './migrations/20231026123042_test_migrator_works'
import { migrate as migrate2 } from './migrations/20231026124442_fix_rate_submittedat'
import { migrate as migrate3 } from './migrations/20231026124542_fix_erroneous_rates'
import { migrate as migrate4 } from './migrations/20231106200334_fix_empty_rates'

// MigrationType describes a single migration with a name and a callable function called migrateProto
interface DBMigrationType {
    name: string
    module: {
        migrate: (client: PrismaTransactionType) => Promise<undefined | Error>
    }
}

// MigratorType is a type covering our two different migrators
export interface MigratorType {
    listMigrationsThatHaveRun(): Promise<string[]>
    runMigrations(migrations: DBMigrationType[]): Promise<undefined | Error>
}

export function newDBMigrator(dbConnString: string): MigratorType {
    const prismaClient = new PrismaClient({
        datasources: {
            db: {
                url: dbConnString,
            },
        },
    })

    return {
        async listMigrationsThatHaveRun(): Promise<string[]> {
            const listMigrationsThatHaveRunTable =
                await prismaClient.protoMigrationsTable.findMany()
            const migrations = listMigrationsThatHaveRunTable.map(
                (m) => m.migrationName
            )

            return migrations
        },

        async runMigrations(migrations: DBMigrationType[]) {
            for (const migration of migrations) {
                try {
                    await prismaClient.$transaction(
                        async (tx) => {
                            const res = await migration.module.migrate(tx)

                            if (!(res instanceof Error)) {
                                await tx.protoMigrationsTable.create({
                                    data: {
                                        migrationName: migration.name,
                                    },
                                })
                            } else {
                                console.error('migrator error:', res)
                                // Since we're inside a transaction block, we throw to abort the transaction
                                throw res
                            }
                        },
                        {
                            timeout: 20000, // 20 second timeout
                        }
                    )
                } catch (err) {
                    console.info('Error came from transaction', migration, err)
                    return new Error(
                        `Migration Failed: ${migration}, ${err.message}`
                    )
                }
            }

            console.info('Done with DB')
            return undefined
        },
    }
}

export async function migrate(
    migrator: MigratorType,
    _migrationPath: string
): Promise<undefined | Error> {
    // const migrationFiles = fs
    //     .readdirSync(migrationPath)
    //     .filter((m) => m.endsWith('.js') && !m.endsWith('.test.js'))

    // for now we do this explicitly.
    const migrations: DBMigrationType[] = [
        {
            name: '20231026123042_test_migrator_works',
            module: {
                migrate: migrate1,
            },
        },
        {
            name: '20231026124442_fix_rate_submittedat',
            module: {
                migrate: migrate2,
            },
        },
        {
            name: '20231026124542_fix_erroneous_rates',
            module: {
                migrate: migrate3,
            },
        },
        {
            name: 'migrations/20231106200334_fix_empty_rates',
            module: {
                migrate: migrate4,
            },
        },
    ]
    // for (const migrationFile of migrationFiles) {
    //     // const fullPath = './migrations/0001_test_migration'
    //     const migrationName = path.parse(migrationFile).name

    //     const fullPath = path.join(migrationPath, migrationFile)
    //     const migration = await import(fullPath)

    //     migrations.push({
    //         name: migrationName,
    //         module: migration,
    //     })
    // }

    const previouslyAppliedMigrationNames =
        await migrator.listMigrationsThatHaveRun()

    const migrationsToRun = migrations.filter((migration) => {
        return !previouslyAppliedMigrationNames.includes(migration.name)
    })

    console.info(
        'New Migrations To Run: ',
        migrationsToRun.map((m) => m.name)
    )

    if (migrationsToRun.length > 0) {
        return await migrator.runMigrations(migrationsToRun)
    }
    return undefined
}
