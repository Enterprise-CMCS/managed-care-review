import LabeledProcessRunner from '../runner.js'

// runS3Locally runs s3 locally
export async function runS3Locally(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        's3 yarn',
        ['yarn', 'install'],
        'services/uploads'
    )
    runner.runCommandAndOutput(
        's3',
        ['serverless', '--stage', 'local', 's3', 'start'],
        'services/uploads'
    )
}
