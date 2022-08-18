import fs from 'fs'
import path from 'path'

import * as genproto from './gen/healthPlanFormDataProto.js'

import { PrismaClient } from '@prisma/client'

// decodes the proto
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

// MigrationType describes a single migration with a name and a callable function called migrateProto
interface MigrationType {
    name: string
    module: {
        migrateProto: (
            oldProto: genproto.mcreviewproto.IHealthPlanFormData
        ) => genproto.mcreviewproto.IHealthPlanFormData
    }
}

// MigratorType is a type covering our two different migrators
interface MigratorType {
    listMigrationsThatHaveRun(): Promise<string[]>
    runMigrations(migrations: MigrationType[]): Promise<void>
}

function newDBMigrator(dbConnString: string): MigratorType {
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

        async runMigrations(migrations: MigrationType[]) {
            const revs = await prismaClient.healthPlanRevisionTable.findMany()

            for (const revision of revs) {
                const protoBytes = revision.formDataProto

                // decode proto files into generated types
                const proto = decodeOrError(protoBytes)
                if (proto instanceof Error) {
                    throw proto
                }

                // migrate proto
                for (const migration of migrations) {
                    migration.module.migrateProto(proto)
                }

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

function newFileMigrator(protoPath: string): MigratorType {
    return {
        async listMigrationsThatHaveRun() {
            // determine migrations to run
            const listMigrationsThatHaveRunList: string[] = []
            const listMigrationsThatHaveRunPath = path.join(
                protoPath,
                '_ran_migrations'
            )
            try {
                const listMigrationsThatHaveRunListBytes = fs.readFileSync(
                    listMigrationsThatHaveRunPath,
                    {
                        encoding: 'utf8',
                    }
                )

                listMigrationsThatHaveRunListBytes
                    .trim()
                    .split('\n')
                    .forEach((filename) =>
                        listMigrationsThatHaveRunList.push(filename)
                    )
            } catch (e) {
                // if there is no file, treat it like there are no ran migrations.
                if (e.code != 'ENOENT') {
                    throw e
                }
            }
            return listMigrationsThatHaveRunList
        },

        async runMigrations(migrations) {
            const testFiles = fs
                .readdirSync(protoPath)
                .filter((filename) => filename.endsWith('.proto'))

            for (const testFile of testFiles) {
                const tPath = path.join(protoPath, testFile)
                const protoBytes = fs.readFileSync(tPath)

                // decode proto files into generated types
                const proto = decodeOrError(protoBytes)
                if (proto instanceof Error) {
                    throw proto
                }

                // migrate proto
                for (const migration of migrations) {
                    migration.module.migrateProto(proto)
                }

                //write Proto
                const newProtoBytes =
                    genproto.mcreviewproto.HealthPlanFormData.encode(
                        proto
                    ).finish()

                fs.writeFileSync(tPath, newProtoBytes)
            }

            // write run migrations to file
            const ranMigrationNames =
                migrations.map((m) => m.name).join('\n') + '\n'

            const listMigrationsThatHaveRunPath = path.join(
                protoPath,
                '_ran_migrations'
            )
            fs.writeFileSync(listMigrationsThatHaveRunPath, ranMigrationNames, {
                encoding: 'utf8',
                flag: 'a',
            })
        },
    }
}

async function main() {
    const args = process.argv.slice(2)

    const usage = `USAGE: 
./migrate_protos.js db :: run migrations against all protos in the db
./migrate_protos.js files [PATH TO .PROTOS] :: run migrations against all protos in given directory`

    const connectionType =
        args.length > 0 && args[0] === 'db' ? 'DATABASE' : 'FILES'

    let migrator: MigratorType | undefined = undefined
    if (connectionType === 'DATABASE') {
        const dbConn = process.env.DATABASE_URL
        if (!dbConn) {
            throw new Error('DATABASE_URL must be defined in env')
        }

        migrator = newDBMigrator(dbConn)
    } else if (connectionType === 'FILES') {
        if (args.length !== 2 || args[0] !== 'files') {
            console.log(usage)
            process.exit(1)
        }
        const pathToProtos = args[1]
        migrator = newFileMigrator(pathToProtos)
    } else {
        console.log(usage)
        throw new Error('unimplemented migrator')
    }

    const migrationFiles = fs
        .readdirSync('./protoMigrations/build/healthPlanFormDataMigrations')
        .filter((m) => m.endsWith('.js') && !m.endsWith('.test.js'))

    const migrations: MigrationType[] = []
    for (const migrationFile of migrationFiles) {
        const fullPath = './healthPlanFormDataMigrations/' + migrationFile

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

    console.log(
        'New Migrations To Run: ',
        migrationsToRun.map((m) => m.name)
    )

    if (migrationsToRun.length > 0) {
        await migrator.runMigrations(migrationsToRun)
    }
}

void main()
