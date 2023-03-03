import LabeledProcessRunner from '../runner.js'

// runS3Locally runs s3 locally
export async function runUploadsLocally(runner: LabeledProcessRunner) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runner.runCommandAndOutput(
        'uploads',
        ['lerna', 'run', 'start', '--scope=uploads'],
        ''
    )
}
