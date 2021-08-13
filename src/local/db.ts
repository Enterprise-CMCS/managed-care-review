import LabeledProcessRunner from '../runner.js'
import { requireBinary } from '../deps.js'

// runDBLocally runs the local db
export async function runDBLocally(runner: LabeledProcessRunner) {
    requireBinary(
        ['java', '-version'],
        'Java is required in order to run the database locally.\nInstall Java Standard Edition (SE) here: https://www.oracle.com/java/technologies/javase-downloads.html'
    )

    await runner.runCommandAndOutput(
        'db yarn',
        ['yarn', 'install'],
        'services/database'
    )
    await runner.runCommandAndOutput(
        'db svls',
        ['serverless', 'dynamodb', 'install'],
        'services/database'
    )

    runner.runCommandAndOutput(
        'db',
        ['serverless', '--stage', 'local', 'dynamodb', 'start', '--migrate'],
        'services/database'
    )
}
