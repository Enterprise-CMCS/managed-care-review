// import * as mig1 from '../../services/app-api/protoMigrations/healthPlanFormDataMigrations/0001_add_one_month.js'
// import * as mig1 from './foobar.js'
import fs from 'fs'
import path from 'path'

import * as genproto from './gen/healthPlanFormDataProto.js'

import { PrismaClient } from '@prisma/client'

function decodeOrError(
    buff: Uint8Array
): genproto.mcreviewproto.HealthPlanFormData | Error {
    try {
        const message = genproto.mcreviewproto.HealthPlanFormData.decode(buff)
        return message
    } catch (e) {
        return new Error(`${e}`)
    }
}

interface TempMigrationType {
    name: string
    module: {
        migrateProto: (
            oldProto: genproto.mcreviewproto.IHealthPlanFormData
        ) => genproto.mcreviewproto.IHealthPlanFormData
    }
}

interface MigratorType {
    ranMigrations(): Promise<string[]>
    runMigrations(migrations: TempMigrationType[]): Promise<void>
}

function dbMigrator(dbConnString: string): MigratorType {
    const prismaClient = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    })

    return {
        async ranMigrations(): Promise<string[]> {
            const ranMigrationsTable =
                await prismaClient.protoMigrationsTable.findMany()
            const migrations = ranMigrationsTable.map((m) => m.migrationName)

            return migrations
        },

        async runMigrations(migrations: TempMigrationType[]) {
            const revs = await prismaClient.healthPlanRevisionTable.findMany()

            console.log(revs)

            for (const revision of revs) {
                const protoBytes = revision.formDataProto

                // decode proto files into generated types
                const proto = decodeOrError(protoBytes)
                if (proto instanceof Error) {
                    throw proto
                }
                console.log(proto.status)
                console.log(proto.contractInfo?.contractDateStart?.month)

                // migrate proto
                for (const migration of migrations) {
                    migration.module.migrateProto(proto)
                }

                console.log(proto.contractInfo?.contractDateStart?.month)
                console.log('desc', proto.submissionDescription)

                const newProtoBytes =
                    genproto.mcreviewproto.HealthPlanFormData.encode(
                        proto
                    ).finish()
                const newProtoBuffer = Buffer.from(newProtoBytes)

                await prismaClient.healthPlanRevisionTable.update({
                    where: {
                        id: revision.id,
                    },
                    data: {
                        formDataProto: newProtoBuffer,
                    },
                })
            }

            const appliedMigrationNames = migrations.map((m) => m.name)
            const appliedMigrationsRows = appliedMigrationNames.map((n) => {
                return { migrationName: n }
            })
            await prismaClient.protoMigrationsTable.createMany({
                data: appliedMigrationsRows,
            })

            console.log('Done with DB')
        },
    }
}

function fileMigrator(protoPath: string): MigratorType {
    return {
        async ranMigrations() {
            // determine migrations to run
            const ranMigrationsList: string[] = []
            const ranMigrationsPath = path.join(protoPath, '_ran_migrations')
            try {
                const ranMigrationsListBytes = fs.readFileSync(
                    ranMigrationsPath,
                    {
                        encoding: 'utf8',
                    }
                )
                console.log('migrationsBYRTE:', ranMigrationsListBytes)

                ranMigrationsListBytes
                    .trim()
                    .split('\n')
                    .forEach((filename) => ranMigrationsList.push(filename))
            } catch (e) {
                // if there is no file, treat it like there are no ran migrations.
                if (e.code != 'ENOENT') {
                    throw e
                }
            }
            console.log('ranmigrations:::', ranMigrationsList)
            return ranMigrationsList
        },

        async runMigrations(migrations) {
            const testFiles = fs
                .readdirSync(protoPath)
                .filter((filename) => filename.endsWith('.proto'))

            console.log(testFiles)
            for (const testFile of testFiles) {
                const tPath = path.join(protoPath, testFile)
                const protoBytes = fs.readFileSync(tPath)

                // decode proto files into generated types
                const proto = decodeOrError(protoBytes)
                if (proto instanceof Error) {
                    throw proto
                }
                console.log(proto.status)
                console.log(proto.contractInfo?.contractDateStart?.month)

                // migrate proto
                for (const migration of migrations) {
                    migration.module.migrateProto(proto)
                }

                console.log(proto.contractInfo?.contractDateStart?.month)
                console.log('desc', proto.submissionDescription)

                //write Proto
                const newProtoBytes =
                    genproto.mcreviewproto.HealthPlanFormData.encode(
                        proto
                    ).finish()

                const success = fs.writeFileSync(tPath, newProtoBytes)
                console.log('write success', success)
            }

            // write run migrations to file
            const ranMigrationNames =
                migrations.map((m) => m.name).join('\n') + '\n'
            console.log('WE RAN', ranMigrationNames)

            const ranMigrationsPath = path.join(protoPath, '_ran_migrations')
            fs.writeFileSync(ranMigrationsPath, ranMigrationNames, {
                encoding: 'utf8',
                flag: 'a',
            })
        },
    }
}

async function main() {
    const args = process.argv.slice(2)
    console.log('args', args)

    const connectionType =
        args.length > 0 && args[0] === 'db' ? 'DATABASE' : 'FILES'

    let migrator: MigratorType | undefined = undefined
    if (connectionType === 'DATABASE') {
        const dbConn = process.env.DATABASE_URL
        if (!dbConn) {
            throw new Error('DATABASE_URL must be defined in env')
        }

        migrator = dbMigrator(dbConn)
    } else if (connectionType === 'FILES') {
        migrator = fileMigrator('protoMigrations/tests/protos')
    } else {
        throw new Error('unimplemented migrator')
    }

    const mig1 = await import(
        './healthPlanFormDataMigrations/0001_add_one_month.js'
    )
    const mig2 = await import(
        './healthPlanFormDataMigrations/0002_reset_description.js'
    )

    const migrations: TempMigrationType[] = [
        {
            name: '0001_add_one_month',
            module: mig1,
        },
        {
            name: '0002_reset_description',
            module: mig2,
        },
    ]

    console.log('all Migrations: ', mig1)

    const previouslyAppliedMigrationNames = await migrator.ranMigrations()

    const migrationsToRun = migrations.filter((migration) => {
        return !previouslyAppliedMigrationNames.includes(migration.name)
    })

    await migrator.runMigrations(migrationsToRun)
}

void main()
