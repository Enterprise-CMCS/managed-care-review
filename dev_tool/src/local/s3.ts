import LabeledProcessRunner from '../runner.js'

// runS3Locally runs s3 locally
export async function runS3Locally(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput(
        's3 yarn',
        ['yarn', 'install'],
        'services/uploads'
    )

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runner.runCommandAndOutput(
        's3',
        ['serverless', 's3', 'start', '--stage', 'local'],
        'services/uploads'
    )
}
