import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

// runS3Locally starts LocalStack and creates S3 buckets
export async function runS3Locally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    console.info('Starting LocalStack (S3) via docker-compose...')

    // Start LocalStack service and wait for healthcheck to pass
    console.info('Waiting for LocalStack to be ready...')
    commandMustSucceedSync('docker', [
        'compose',
        'up',
        '-d',
        '--wait',
        'localstack',
    ])

    const buckets = ['local-uploads', 'local-qa']
    const localstackEndpoint = 'http://localhost:4566'

    console.info('Creating S3 buckets in LocalStack...')

    // Create buckets using AWS CLI with LocalStack endpoint
    // Pass credentials directly to avoid polluting global process.env
    const localstackEnv = {
        ...process.env,
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
    }

    for (const bucket of buckets) {
        try {
            commandMustSucceedSync(
                'aws',
                [
                    's3',
                    'mb',
                    `s3://${bucket}`,
                    '--endpoint-url',
                    localstackEndpoint,
                    '--region',
                    'us-east-1',
                ],
                { env: localstackEnv }
            )
            console.info(`Created bucket: ${bucket}`)
        } catch (error) {
            // Failed to create bucket (may already exist, or another error occurred)
            console.info(`Failed to create bucket "${bucket}" (it may already exist): ${error}`)
        }
    }

    console.info('✅ LocalStack is ready')
    console.info('   S3 endpoint: http://localhost:4566')
}
