import {
    CloudFormationClient,
    DeleteStackCommand,
    DescribeStacksCommand,
    DescribeStackResourcesCommand,
    waitUntilStackDeleteComplete,
} from '@aws-sdk/client-cloudformation'
import {
    S3Client,
    ListObjectVersionsCommand,
    DeleteObjectsCommand,
    PutBucketVersioningCommand,
} from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import {
    SecretsManagerClient,
    DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager'

const AWSConfig = {
    region: 'us-east-1',
}

// CDK stacks to destroy in reverse dependency order
const cdkStackPrefixes = [
    'frontend-app',
    'app-api',
    'virus-scanning',
    'cognito',
    'postgres',
    'frontend-infra',
    'uploads',
    'network',
]

const protectedStages = [
    'develop',
    'main',
    'master',
    'impl',
    'val',
    'prod',
    'production',
    'dev',
]

const stage = process.argv[2]
const cf = new CloudFormationClient(AWSConfig)
const s3 = new S3Client(AWSConfig)
const lambda = new LambdaClient(AWSConfig)
const secretsManager = new SecretsManagerClient(AWSConfig)

async function main() {
    if (!stage) {
        console.error('Usage: node destroy-cdk.js <stage-name>')
        process.exit(1)
    }

    if (protectedStages.includes(stage)) {
        console.info(`Stage ${stage} is protected. Aborting destroy.`)
        process.exit(1)
    }

    try {
        console.info(`Starting destroy process for CDK stage: ${stage}`)

        // Step 1: Delete logical database for review environments
        await deleteLogicalDatabase(stage)

        // Step 2: Get CDK stacks to destroy
        const stacksToDestroy = await getCdkStacksFromStage(stage)

        if (process.env.CI === 'true' && stacksToDestroy.length === 0) {
            console.warn(
                `We're in CI and there are no CDK stacks to destroy. Alerting.`
            )
            process.exit(1)
        }

        if (stacksToDestroy.length === 0) {
            console.info(`No CDK stacks to destroy. Skipping destroy.`)
            process.exit(0)
        }

        console.info(
            `Getting ready to remove the following CDK stacks: ${stacksToDestroy.join(', ')}`
        )

        // Step 3: Destroy stacks in order
        for (const stack of stacksToDestroy) {
            console.info(`Destroying CDK stack: ${stack}`)

            // Clear S3 buckets in the stack
            const clearBucketOutput = await clearS3BucketsInStack(stack)
            if (clearBucketOutput instanceof Error) {
                console.info(
                    `Could not clear buckets in ${stack}: ${clearBucketOutput.message}`
                )
            }

            // Delete the stack
            const deleteStackOutput = await deleteStack(stack)
            if (deleteStackOutput instanceof Error) {
                console.error(
                    `Could not delete ${stack}: ${deleteStackOutput.message}`
                )
                continue
            }

            console.info(`Destroy successful: ${stack}`)
        }

        console.info(`All CDK stacks destroyed for stage: ${stage}`)
    } catch (err) {
        console.error(`Destroy was not successful: ${err}`)
        process.exit(1)
    }
}

/**
 * Delete the logical database for review environments
 */
async function deleteLogicalDatabase(stageName: string): Promise<void> {
    console.info(`Attempting to delete logical database for ${stageName}...`)

    try {
        // Get the dev database secret ARN
        const devSecretName = 'aurora-postgres-dev-cdk'
        const describeSecretCommand = new DescribeSecretCommand({
            SecretId: devSecretName,
        })
        const secretResponse = await secretsManager.send(describeSecretCommand)
        const devSecretArn = secretResponse.ARN

        if (!devSecretArn) {
            console.info(
                `Could not find dev database secret. Skipping logical database deletion.`
            )
            return
        }

        // Invoke the logicalDbManager Lambda to delete the logical database
        const functionName = 'postgres-dev-dbManager-cdk'
        const payload = {
            action: 'delete',
            stageName: stageName,
            devDbSecretArn: devSecretArn,
        }

        console.info(`Invoking ${functionName} to delete logical database...`)

        const invokeCommand = new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
        })

        const response = await lambda.send(invokeCommand)
        const responsePayload = JSON.parse(
            new TextDecoder().decode(response.Payload)
        )

        console.info(
            `Logical database deletion response:`,
            JSON.stringify(responsePayload, null, 2)
        )

        if (responsePayload.statusCode === 200) {
            console.info(
                `Logical database deleted successfully for ${stageName}`
            )
        } else {
            console.warn(
                `Logical database deletion returned non-200 status: ${responsePayload.statusCode}`
            )
        }
    } catch (err) {
        console.warn(
            `Could not delete logical database for ${stageName}: ${err}`
        )
        console.info(`Continuing with stack deletion...`)
    }
}

/**
 * Get all CDK stacks for a given stage
 */
async function getCdkStacksFromStage(stageName: string): Promise<string[]> {
    const stacksToDestroy: string[] = []

    for (const prefix of cdkStackPrefixes) {
        const stackName = `${prefix}-${stageName}-cdk`

        try {
            const commandDescribeStacks = new DescribeStacksCommand({
                StackName: stackName,
            })
            const stacks = await cf.send(commandDescribeStacks)

            if (stacks.Stacks === undefined || stacks.Stacks.length === 0) {
                console.info(`Stack ${stackName} was not found. Skipping.`)
                continue
            }

            const foundStack = stacks.Stacks[0]
            if (foundStack.StackName) {
                stacksToDestroy.push(foundStack.StackName)
            }
        } catch (err: any) {
            if (err.name === 'ValidationError') {
                console.info(`Stack ${stackName} does not exist. Skipping.`)
            } else {
                console.error(
                    `Error checking stack ${stackName}: ${err}. Skipping.`
                )
            }
        }
    }

    return stacksToDestroy
}

/**
 * Clear all S3 buckets in a CloudFormation stack
 */
async function clearS3BucketsInStack(stackName: string): Promise<void | Error> {
    const buckets = await getBucketsInStack(stackName)

    if (buckets instanceof Error) {
        return new Error(
            `Could not get buckets in stack ${stackName}: ${buckets.message}`
        )
    }

    if (buckets.length === 0) {
        console.info(`No S3 buckets found in stack ${stackName}`)
        return
    }

    const clearBucketOutput = await Promise.all(
        buckets.map(async (bucket) => {
            try {
                // Turn off versioning on the bucket
                const versionResponse = await turnOffVersioningOnBucket(bucket)
                if (versionResponse instanceof Error) {
                    return versionResponse
                }

                // Get all versioned files in the bucket
                console.info(`Clearing bucket: ${bucket.PhysicalResourceId}`)
                const keys = await getVersionedFilesInBucket(bucket)
                if (keys instanceof Error) {
                    return keys
                }

                return await deleteKeysFromS3Bucket(bucket, keys)
            } catch (err: any) {
                return new Error(
                    `Error clearing bucket ${bucket.PhysicalResourceId}: ${err.message}`
                )
            }
        })
    )

    const errors = clearBucketOutput.filter((output) => output instanceof Error)
    if (errors.length > 0) {
        return new Error(
            `Encountered errors while clearing buckets: ${errors.map((e: any) => e.message).join(', ')}`
        )
    }
}

/**
 * Get all S3 buckets in a CloudFormation stack
 */
async function getBucketsInStack(stackName: string): Promise<any[] | Error> {
    try {
        const commandDescribeStackResources = new DescribeStackResourcesCommand(
            {
                StackName: stackName,
            }
        )
        const stack = await cf.send(commandDescribeStackResources)

        if (stack.StackResources === undefined) {
            return new Error('Could not find stack resources')
        }

        return stack.StackResources.filter(
            (resource) => resource.ResourceType === 'AWS::S3::Bucket'
        )
    } catch (err: any) {
        return new Error(`Could not get stack resources: ${err.message}`)
    }
}

/**
 * Turn off versioning on an S3 bucket
 */
async function turnOffVersioningOnBucket(bucket: any): Promise<void | Error> {
    console.info(
        `Turning off bucket versioning on bucket: ${bucket.PhysicalResourceId}`
    )

    const versionParams = {
        Bucket: bucket.PhysicalResourceId ?? '',
        VersioningConfiguration: { Status: 'Suspended' as const },
    }

    try {
        const commandPutBucketVersioning = new PutBucketVersioningCommand(
            versionParams
        )
        await s3.send(commandPutBucketVersioning)
    } catch (err: any) {
        return new Error(`Could not turn off bucket versioning: ${err.message}`)
    }
}

/**
 * Get all versioned files and delete markers from an S3 bucket
 */
async function getVersionedFilesInBucket(
    bucket: any
): Promise<Array<{ Key: string; VersionId: string }> | Error> {
    const bucketParams = {
        Bucket: bucket.PhysicalResourceId ?? '',
    }

    try {
        const commandListObjectVersions = new ListObjectVersionsCommand(
            bucketParams
        )
        const objectVersions = await s3.send(commandListObjectVersions)

        const versionKeys =
            objectVersions.Versions?.map((c) => ({
                Key: c.Key ?? '',
                VersionId: c.VersionId ?? '',
            })) ?? []

        const deleteMarkerKeys =
            objectVersions.DeleteMarkers?.map((c) => ({
                Key: c.Key ?? '',
                VersionId: c.VersionId ?? '',
            })) ?? []

        return [...versionKeys, ...deleteMarkerKeys]
    } catch (err: any) {
        return new Error(`Could not list object versions: ${err.message}`)
    }
}

/**
 * Delete keys from an S3 bucket (handles batching for 1000 key limit)
 */
async function deleteKeysFromS3Bucket(
    bucket: any,
    keys: Array<{ Key: string; VersionId: string }>
): Promise<void | Error> {
    if (keys.length === 0) {
        console.info(`No keys to delete in bucket ${bucket.PhysicalResourceId}`)
        return
    }

    // deleteObjects is limited to 1000 keys per request
    const keysArray = Array.from(
        { length: Math.ceil(keys.length / 999) },
        (v, i) => keys.slice(i * 999, i * 999 + 999)
    )

    const emptyBucketOutput = await Promise.all(
        keysArray.map(async (k) => {
            const commandDeleteObjects = new DeleteObjectsCommand({
                Bucket: bucket.PhysicalResourceId ?? '',
                Delete: {
                    Objects: k,
                },
            })

            try {
                await s3.send(commandDeleteObjects)
            } catch (err: any) {
                return new Error(`Could not delete keys: ${err.message}`)
            }
        })
    )

    const errors = emptyBucketOutput.filter((output) => output instanceof Error)
    if (errors.length > 0) {
        return new Error(
            `Encountered errors while deleting keys: ${errors.map((e: any) => e.message).join(', ')}`
        )
    }
}

/**
 * Delete a CloudFormation stack and wait for completion
 */
async function deleteStack(stackName: string): Promise<void | Error> {
    try {
        // Check if stack exists
        const commandDescribeStacks = new DescribeStacksCommand({
            StackName: stackName,
        })
        const stack = await cf.send(commandDescribeStacks)

        if (stack.Stacks === undefined || stack.Stacks.length === 0) {
            return new Error(`Could not find stack ${stackName}`)
        }

        console.info(`Deleting stack: ${stackName}`)

        // Delete the stack - optionally use a specific role if provided via env var
        // Otherwise let CloudFormation use the caller's credentials
        const deleteParams: any = {
            StackName: stackName,
        }

        if (process.env.CDK_CLEANUP_ROLE_ARN) {
            console.info(`Using role for deletion: ${process.env.CDK_CLEANUP_ROLE_ARN}`)
            deleteParams.RoleARN = process.env.CDK_CLEANUP_ROLE_ARN
        } else {
            console.info(`Deleting stack using caller credentials (no role override)`)
        }

        const commandDeleteStack = new DeleteStackCommand(deleteParams)
        await cf.send(commandDeleteStack)

        console.info(`Waiting for stack ${stackName} to be deleted...`)

        // Wait for stack deletion to complete (with timeout)
        try {
            await waitUntilStackDeleteComplete(
                {
                    client: cf,
                    maxWaitTime: 1800, // 30 minutes
                    minDelay: 5,
                    maxDelay: 30,
                },
                { StackName: stackName }
            )
            console.info(`Stack ${stackName} deleted successfully`)
        } catch (waitErr: any) {
            return new Error(
                `Timeout or error waiting for stack deletion: ${waitErr.message}`
            )
        }
    } catch (err: any) {
        return new Error(`Error deleting stack: ${err.message}`)
    }
}

// Run the script
main()
