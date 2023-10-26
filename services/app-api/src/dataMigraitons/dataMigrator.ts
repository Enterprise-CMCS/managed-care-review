import fs from 'fs'

import { PrismaClient } from '@prisma/client'
import type { PrismaTransactionType } from '../postgres/prismaTypes'

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
                    await prismaClient.$transaction(async (tx) => {
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
                    })
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
    path: string
): Promise<undefined | Error> {
    const migrationPath = path

    const migrationFiles = fs
        .readdirSync(migrationPath)
        .filter((m) => m.endsWith('.js') && !m.endsWith('.test.js'))

    const migrations: DBMigrationType[] = []
    for (const migrationFile of migrationFiles) {
        // const fullPath = `./build/migrations/${migrationFile}`
        const fullPath = './migrations/0001_test_migration'

        const migrationName = migrationFile.substring(
            0,
            migrationFile.lastIndexOf('.')
        )

        const migration = await import(fullPath)

        migrations.push({
            name: migrationName,
            module: migration,
        })
    }

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

async function main() {
    const args = process.argv.slice(2)

    const usage = `USAGE: 
./migrate_data.js [PATH TO MIGRATIONS] :: run migrations against the db`

    const pathToProtos = args[0]
    if (pathToProtos === undefined) {
        console.info(usage)
        process.exit(1)
    }

    const dbConn = process.env.DATABASE_URL
    if (!dbConn) {
        throw new Error('DATABASE_URL must be defined in env')
    }

    const migrator = newDBMigrator(dbConn)

    await migrate(migrator, pathToProtos)
}

void main()
