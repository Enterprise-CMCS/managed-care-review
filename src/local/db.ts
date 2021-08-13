import LabeledProcessRunner from '../runner.js'
import { requireBinary } from '../deps.js'

// run_db_locally runs the local db
export async function run_db_locally(runner: LabeledProcessRunner) {
    requireBinary(
        ['java', '-version'],
        'Java is required in order to run the database locally.\nInstall Java Standard Edition (SE) here: https://www.oracle.com/java/technologies/javase-downloads.html'
    )

    await runner.run_command_and_output(
        'db yarn',
        ['yarn', 'install'],
        'services/database'
    )
    await runner.run_command_and_output(
        'db svls',
        ['serverless', 'dynamodb', 'install'],
        'services/database'
    )

    runner.run_command_and_output(
        'db',
        ['serverless', '--stage', 'local', 'dynamodb', 'start', '--migrate'],
        'services/database'
    )
}
