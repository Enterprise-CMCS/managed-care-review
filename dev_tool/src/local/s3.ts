import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'

// runS3Locally starts LocalStack and creates S3 buckets
export async function runS3Locally(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    console.info('Starting LocalStack (S3) via docker-compose...')

    // Start LocalStack service from docker-compose
    commandMustSucceedSync('docker', ['compose', 'up', '-d', 'localstack'])

    // Wait for LocalStack to be ready
    console.info('Waiting for LocalStack to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const buckets = ['local-uploads', 'local-qa']
    const localstackEndpoint = 'http://localhost:4566'

    console.info('Creating S3 buckets in LocalStack...')

    // Set AWS credentials for LocalStack (required by AWS CLI)
    process.env.AWS_ACCESS_KEY_ID = 'test'
    process.env.AWS_SECRET_ACCESS_KEY = 'test'

    // Create buckets using AWS CLI with LocalStack endpoint
    for (const bucket of buckets) {
        try {
            commandMustSucceedSync('aws', [
                's3',
                'mb',
                `s3://${bucket}`,
                '--endpoint-url',
                localstackEndpoint,
                '--region',
                'us-east-1',
            ])
            console.info(`Created bucket: ${bucket}`)
        } catch (error) {
            // Bucket might already exist, that's ok
            console.info(`Bucket ${bucket} already exists: ${error}`)
        }
    }

    console.info('✅ LocalStack is ready')
    console.info('   S3 endpoint: http://localhost:4566')
}
