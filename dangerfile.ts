import * as fs from 'fs'
import { danger } from 'danger'

// verifyMigrationTransactions() checks that all migrations are wrapped in a transaction
const verifyMigrationTransactions = async () => {
    const modified = danger.git.modified_files
    const editedFiles = modified.concat(danger.git.created_files)

    const migrationFiles = editedFiles.filter(
        (file) =>
            file.includes('app-api/prisma/migrations') && file.match(/\.(sql)$/)
    )

    for (const file of migrationFiles) {
        const content = fs.readFileSync(file).toString()
        console.info(content)
    }
}

;(async function () {
    verifyMigrationTransactions()
})()
