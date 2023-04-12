import * as fs from 'fs'
import * as readline from 'readline'
import * as stream from 'stream'
import { danger, fail } from 'danger'

// verifyMigrationTransactions() checks that all migrations are wrapped in a transaction
const verifyMigrationTransactions = async () => {
    const modified = danger.git.modified_files
    const editedFiles = modified.concat(danger.git.created_files)

    const migrationFiles = editedFiles.filter(
        (file) =>
            file.includes('app-api/prisma/migrations') && file.match(/\.(sql)$/)
    )

    for (const file of migrationFiles) {
        const firstLine = await readFirstLine(file)
        const lastLine = await readLastLine(file)

        if (firstLine !== 'BEGIN;' || lastLine !== 'COMMIT;') {
            fail(`Migration ${file} is not wrapped in a transaction`)
        }
    }
}

async function readFirstLine(file: string) {
    const fileStream = fs.createReadStream(file, { encoding: 'utf8' })
    const reader = readline.createInterface({ input: fileStream })

    const line = await new Promise((resolve) => {
        reader.on('line', (line) => {
            reader.close()
            resolve(line)
        })
    })
    fileStream.close()
    return line
}

async function readLastLine(file: string, minLength: number = 1) {
    let fileStream = fs.createReadStream(file, { encoding: 'utf8' })
    let outStream = new stream.Writable()

    let rl = readline.createInterface(fileStream, outStream)
    let lastLine = ''

    const line = await new Promise((resolve) => {
        rl.on('line', (line) => {
            if (line.length >= minLength) {
                lastLine = line
            }
        })
        rl.on('error', function (err) {
            console.error(err)
        })

        rl.on('close', function () {
            resolve(lastLine)
        })
    })
    fileStream.close()
    return line
}

;(async function () {
    verifyMigrationTransactions()
})()
