import LabeledProcessRunner from '../runner.js'

// run_s3_locally runs s3 locally
export async function run_s3_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        's3 yarn',
        ['yarn', 'install'],
        'services/uploads'
    )
    runner.run_command_and_output(
        's3',
        ['serverless', '--stage', 'local', 's3', 'start'],
        'services/uploads'
    )
}
