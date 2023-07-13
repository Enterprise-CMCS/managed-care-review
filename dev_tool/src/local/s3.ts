import LabeledProcessRunner from '../runner.js'

// runS3Locally runs s3 locally
export async function runS3Locally(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('s3 yarn', ['yarn', 'install'], '')

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runner.runCommandAndOutput('s3', ['yarn', 'start'], 'services/uploads')
}
