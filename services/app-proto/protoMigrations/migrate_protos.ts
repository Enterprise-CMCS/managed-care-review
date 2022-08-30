import {
    MigratorType,
    newDBMigrator,
    newFileMigrator,
    migrate,
} from './lib/migrator'

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

    await migrate(migrator)
}

void main()
