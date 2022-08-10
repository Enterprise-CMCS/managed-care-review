// import * as mig1 from '../../services/app-api/protoMigrations/healthPlanFormDataMigrations/0001_add_one_month.js'
// import * as mig1 from './foobar.js'
import fs from 'fs'
import path from 'path'

import genproto from '../../app-web/src/gen/healthPlanFormDataProto.js'

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

type TempMigrationType = {
    name: string
    module: {
        migrateProto: (
            oldProto: genproto.mcreviewproto.IHealthPlanFormData
        ) => genproto.mcreviewproto.IHealthPlanFormData
    }
}

async function main() {
    const args = process.argv.slice(2)
    console.log('args', args)

    const connectionType =
        args.length === 1 && args[0] === 'db' ? 'DATABASE' : 'FILES'

    const mig1 = await import(
        '../../app-api/protoMigrations/healthPlanFormDataMigrations/0001_add_one_month.js'
    )
    const mig2 = await import(
        '../../app-api/protoMigrations/healthPlanFormDataMigrations/0002_reset_description.js'
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

    if (connectionType === 'DATABASE') {
        console.log('connecting to db', process.env.DATABASE_URL)

        const prismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        })

        const appliedMigrations =
            await prismaClient.protoMigrationsTable.findMany()
        console.log('MIGS', appliedMigrations)
        const previouslyAppliedMigrationNames = appliedMigrations.map(
            (m) => m.migrationName
        )

        const migrationsToRun = migrations.filter((migration) => {
            return !previouslyAppliedMigrationNames.includes(migration.name)
        })

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
            for (const migration of migrationsToRun) {
                migration.module.migrateProto(proto)
            }

            console.log(proto.contractInfo?.contractDateStart?.month)
            console.log('desc', proto.submissionDescription)

            const newProtoBytes =
                genproto.mcreviewproto.HealthPlanFormData.encode(proto).finish()
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

        const appliedMigrationNames = migrationsToRun.map((m) => m.name)
        const appliedMigrationsRows = appliedMigrationNames.map((n) => {
            return { migrationName: n }
        })
        await prismaClient.protoMigrationsTable.createMany({
            data: appliedMigrationsRows,
        })

        console.log('Done with DB')
    }

    // read .proto files
    const testFilesPath =
        '../app-web/src/common-code/proto/healthPlanFormDataProto/dataForTestingTheOldEncodingsTest'
    const testFiles = fs
        .readdirSync(testFilesPath)
        .filter((filename) => filename != '_ran_migrations')

    // determine migrations to run
    const ranMigrationsList: string[] = []
    const ranMigrationsPath = path.join(testFilesPath, '_ran_migrations')
    try {
        const ranMigrationsListBytes = fs.readFileSync(ranMigrationsPath, {
            encoding: 'utf8',
        })
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

    const migrationsToRun = migrations.filter((migration) => {
        return !ranMigrationsList.includes(migration.name)
    })

    console.log('TO RUN', migrationsToRun)

    console.log(testFiles)
    for (const testFile of testFiles) {
        const tPath = path.join(testFilesPath, testFile)
        const protoBytes = fs.readFileSync(tPath)

        // decode proto files into generated types
        const proto = decodeOrError(protoBytes)
        if (proto instanceof Error) {
            throw proto
        }
        console.log(proto.status)
        console.log(proto.contractInfo?.contractDateStart?.month)

        // migrate proto
        for (const migration of migrationsToRun) {
            migration.module.migrateProto(proto)
        }

        console.log(proto.contractInfo?.contractDateStart?.month)
        console.log('desc', proto.submissionDescription)

        //write Proto
        const newProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(proto).finish()

        const success = fs.writeFileSync(tPath, newProtoBytes)
        console.log('write success', success)
    }

    // write run migrations to file
    const ranMigrationNames =
        migrationsToRun.map((m) => m.name).join('\n') + '\n'
    console.log('WE RAN', ranMigrationNames)

    fs.writeFileSync(ranMigrationsPath, ranMigrationNames, {
        encoding: 'utf8',
        flag: 'a',
    })
}

await main()
