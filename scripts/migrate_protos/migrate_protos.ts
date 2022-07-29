// import * as mig1 from '../../services/app-api/protoMigrations/healthPlanFormDataMigrations/0001_add_one_month.js'
// import * as mig1 from './foobar.js'
import fs from 'fs'
import path from 'path'

import genproto from '../../services/app-web/src/gen/healthPlanFormDataProto.js'

const foo: number = 3


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
       migrateProto: (oldProto: genproto.mcreviewproto.IHealthPlanFormData) =>  genproto.mcreviewproto.IHealthPlanFormData
    }
}

async function main() {
    console.log('foo', foo)

    const mig1 = await import ('../../services/app-api/protoMigrations/healthPlanFormDataMigrations/0001_add_one_month.js')
    const mig2 = await import ('../../services/app-api/protoMigrations/healthPlanFormDataMigrations/0002_reset_description.js')

    const migrations: TempMigrationType[] = [
        {
            name: '0001_add_one_month',
            module: mig1
        },
        {
            name: '0002_reset_description',
            module: mig2
        },
    ]

    console.log("all Migrations: ", mig1)

    // read .proto files
    const testFilesPath = '../services/app-web/src/common-code/proto/healthPlanFormDataProto/dataForTestingTheOldEncodingsTest'
    const testFiles = fs.readdirSync(testFilesPath).filter( filename => filename != '_ran_migrations')

    // determine migrations to run
    const ranMigrationsList: string[] = []
    const ranMigrationsPath = path.join(testFilesPath, '_ran_migrations')
    try {
        const ranMigrationsListBytes = fs.readFileSync(ranMigrationsPath, {encoding: 'utf8'})
        console.log('migrationsBYRTE:', ranMigrationsListBytes)

        ranMigrationsListBytes.trim().split("\n").forEach( filename => ranMigrationsList.push(filename) )

    } catch (e) {
        // if there is no file, treat it like there are no ran migrations. 
        if (e.code != 'ENOENT') {
            throw e
        }
    }
    console.log('ranmigrations:::', ranMigrationsList)

    const migrationsToRun = migrations.filter( migration => {
        return !ranMigrationsList.includes(migration.name)
    })

    console.log("TO RUN", migrationsToRun)

    console.log(testFiles)
    const oldProtos = []
    const newProtos = []
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
        oldProtos.push(proto)

        // migrate proto
        for (const migration of migrationsToRun) {
            migration.module.migrateProto(proto)
        }

        newProtos.push(proto)
        console.log(proto.contractInfo?.contractDateStart?.month)
        console.log('desc', proto.submissionDescription)

        //write Proto
        const newProtoBytes = genproto.mcreviewproto.HealthPlanFormData.encode(proto).finish()

        const success = fs.writeFileSync(tPath, newProtoBytes)
        console.log("write success", success)
        
    }

    // write run migrations to file
    const ranMigrationNames = migrationsToRun.map( m => m.name).join('\n') + '\n'
    console.log("WE RAN", ranMigrationNames)

    fs.writeFileSync(ranMigrationsPath, ranMigrationNames, { encoding: 'utf8', flag: 'a' })


}

main()
