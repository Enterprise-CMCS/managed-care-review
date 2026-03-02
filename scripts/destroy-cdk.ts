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
    PutBucketLoggingCommand,
} from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import {
    CloudFrontClient,
    ListInvalidationsCommand,
    GetInvalidationCommand,
} from '@aws-sdk/client-cloudfront'
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
    'github-oidc', // Must be last since other stacks depend on it for permissions
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
const cloudfront = new CloudFrontClient(AWSConfig)
const secretsManager = new SecretsManagerClient(AWSConfig)

async function main() {
    if (!stage) {
        console.error('Usage: node destroy-cdk.js <stage-name>')
        console.error('  <stage-name>  Stage name to destroy')
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

            // Wait for CloudFront invalidations to complete
            const cloudFrontOutput =
                await waitForCloudFrontInvalidationsInStack(stack)
            if (cloudFrontOutput instanceof Error) {
                console.info(
                    `Could not wait for CloudFront invalidations in ${stack}: ${cloudFrontOutput.message}`
                )
            }

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
        const devSecretName = 'aurora-postgres-dev-cdk' // pragma: allowlist secret
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
            console.info(`Found ${stacks.Stacks?.length} stacks.`)

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
 * Wait for all CloudFront invalidations in a stack to complete
 */
async function waitForCloudFrontInvalidationsInStack(
    stackName: string
): Promise<void | Error> {
    const distributions = await getDistributionsInStack(stackName)

    if (distributions instanceof Error) {
        return new Error(
            `Could not get distributions in stack ${stackName}: ${distributions.message}`
        )
    }

    if (distributions.length === 0) {
        console.info(`No CloudFront distributions found in stack ${stackName}`)
        return
    }

    console.info(
        `Found ${distributions.length} CloudFront distribution(s) in stack ${stackName}`
    )

    for (const distribution of distributions) {
        const distributionId = distribution.PhysicalResourceId
        if (!distributionId) continue

        const result = await waitForDistributionInvalidations(distributionId)
        if (result instanceof Error) {
            return result
        }
    }

    console.info(`All CloudFront invalidations complete for stack ${stackName}`)
}

/**
 * Wait for all in-progress invalidations on a CloudFront distribution to complete
 */
export async function waitForDistributionInvalidations(
    distributionId: string
): Promise<void | Error> {
    if (!distributionId || distributionId === '') {
        return new Error('Distribution ID cannot be empty')
    }
    console.info(
        `Checking invalidations for CloudFront distribution: ${distributionId}`
    )

    try {
        // List all invalidations for the distribution
        const listCommand = new ListInvalidationsCommand({
            DistributionId: distributionId,
        })
        const response = await cloudfront.send(listCommand)

        const inProgressInvalidations =
            response.InvalidationList?.Items?.filter(
                (item) => item.Status === 'InProgress'
            ) ?? []

        if (inProgressInvalidations.length === 0) {
            console.info(
                `No in-progress invalidations for distribution ${distributionId}`
            )
            return
        }

        console.info(
            `Found ${inProgressInvalidations.length} in-progress invalidation(s) for ${distributionId}`
        )

        // Wait for each in-progress invalidation to complete
        for (const invalidation of inProgressInvalidations) {
            if (!invalidation.Id) continue

            console.info(
                `Waiting for invalidation ${invalidation.Id} to complete...`
            )

            // Poll until invalidation is complete
            let status = 'InProgress'
            while (status === 'InProgress') {
                await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds between checks

                const getCommand = new GetInvalidationCommand({
                    DistributionId: distributionId,
                    Id: invalidation.Id,
                })
                const result = await cloudfront.send(getCommand)
                status = result.Invalidation?.Status ?? 'Completed'

                console.info(
                    `Invalidation ${invalidation.Id} status: ${status}`
                )
            }

            console.info(`Invalidation ${invalidation.Id} completed`)
        }
    } catch (err: any) {
        return new Error(`Could not wait for invalidations: ${err.message}`)
    }
}

/**
 * Get all CloudFront distributions in a CloudFormation stack
 */
async function getDistributionsInStack(
    stackName: string
): Promise<any[] | Error> {
    try {
        const command = new DescribeStackResourcesCommand({
            StackName: stackName,
        })
        const stack = await cf.send(command)

        if (stack.StackResources === undefined) {
            return new Error('Could not find stack resources')
        }

        return stack.StackResources.filter(
            (resource) =>
                resource.ResourceType === 'AWS::CloudFront::Distribution'
        )
    } catch (err: any) {
        return new Error(`Could not get stack resources: ${err.message}`)
    }
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
            return await emptyS3Bucket(bucket.PhysicalResourceId)
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
 * Empty an S3 bucket by deleting all objects and versions
 */
export async function emptyS3Bucket(bucketName: string): Promise<void | Error> {
    if (!bucketName || bucketName === '') {
        return new Error('Bucket name cannot be empty')
    }
    console.info(`Emptying S3 bucket: ${bucketName}`)

    const bucket = { PhysicalResourceId: bucketName }

    try {
        // Disable access logging
        const loggingResult = await disableS3AccessLogging(bucket)
        if (loggingResult instanceof Error) {
            console.warn(
                `Could not disable access logging on ${bucketName}: ${loggingResult.message}`
            )
        }

        // Turn off versioning
        const versionResult = await turnOffVersioningOnBucket(bucket)
        if (versionResult instanceof Error) {
            console.warn(
                `Could not turn off versioning on ${bucketName}: ${versionResult.message}`
            )
        }

        // Get and delete all versioned objects
        const keys = await getVersionedFilesInBucket(bucket)
        if (keys instanceof Error) {
            return keys
        }

        const deleteResult = await deleteKeysFromS3Bucket(bucket, keys)
        if (deleteResult instanceof Error) {
            return deleteResult
        }

        console.info(`Successfully emptied bucket: ${bucketName}`)
    } catch (err: any) {
        return new Error(`Error emptying bucket ${bucketName}: ${err.message}`)
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
 * Disable access logging on an S3 bucket
 */
async function disableS3AccessLogging(bucket: any): Promise<void | Error> {
    console.info(
        `Disabling access logging on bucket: ${bucket.PhysicalResourceId}`
    )

    try {
        const command = new PutBucketLoggingCommand({
            Bucket: bucket.PhysicalResourceId ?? '',
            BucketLoggingStatus: {},
        })
        await s3.send(command)
    } catch (err: any) {
        return new Error(`Could not disable access logging: ${err.message}`)
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
    const bucketName = bucket.PhysicalResourceId ?? ''

    console.info(`Listing versions for bucket: ${bucketName}`)

    if (!bucketName) {
        console.error(
            `Bucket name is empty. Bucket object: ${JSON.stringify(bucket, null, 2)}`
        )
        return new Error('Bucket name is empty')
    }

    const allKeys: Array<{ Key: string; VersionId: string }> = []
    let keyMarker: string | undefined
    let versionIdMarker: string | undefined
    let pageCount = 0

    try {
        // Paginate through all versions
        do {
            pageCount++
            const commandListObjectVersions = new ListObjectVersionsCommand({
                Bucket: bucketName,
                KeyMarker: keyMarker,
                VersionIdMarker: versionIdMarker,
            })
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

            allKeys.push(...versionKeys, ...deleteMarkerKeys)

            // Set markers for next page
            keyMarker = objectVersions.NextKeyMarker
            versionIdMarker = objectVersions.NextVersionIdMarker

            process.stdout.write(
                `\r  Fetching keys... page ${pageCount}, ${allKeys.length} keys collected so far`
            )
        } while (keyMarker)

        process.stdout.write('\n')
        console.info(
            `Found ${allKeys.length} object(s) across ${pageCount} page(s) in bucket ${bucketName}`
        )
        return allKeys
    } catch (err: any) {
        return new Error(
            `Could not list object versions in ${bucketName}: ${err.message}`
        )
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

    const concurrency = 5
    const delayBetweenBatches = 50 // ms between launching each batch to avoid bursting
    console.info(
        `Deleting ${keys.length} keys in ${keysArray.length} batches (concurrency: ${concurrency})`
    )

    const errors: Error[] = []
    let deletedCount = 0

    // Process batches in parallel with a concurrency limit
    for (let i = 0; i < keysArray.length; i += concurrency) {
        const window = keysArray.slice(i, i + concurrency)

        const results = await Promise.all(
            window.map(async (batch, j) => {
                // Stagger launches within the window to avoid request bursts
                await new Promise((resolve) =>
                    setTimeout(resolve, j * delayBetweenBatches)
                )
                const commandDeleteObjects = new DeleteObjectsCommand({
                    Bucket: bucket.PhysicalResourceId ?? '',
                    Delete: { Objects: batch },
                })
                try {
                    await s3.send(commandDeleteObjects)
                    return { count: batch.length, error: null }
                } catch (err: any) {
                    return {
                        count: 0,
                        error: new Error(
                            `Batch ${i + j + 1} failed: ${err.message}`
                        ),
                    }
                }
            })
        )

        for (const result of results) {
            if (result.error) {
                errors.push(result.error)
            } else {
                deletedCount += result.count
            }
        }

        process.stdout.write(
            `\r  Deleting keys... ${Math.min(i + concurrency, keysArray.length)}/${keysArray.length} batches done, ${deletedCount}/${keys.length} keys deleted`
        )
    }

    process.stdout.write('\n')

    if (errors.length > 0) {
        return new Error(
            `Encountered errors while deleting keys: ${errors.map((e) => e.message).join(', ')}`
        )
    }
}

/**
 * Delete a CloudFormation stack and wait for completion
 */
export async function deleteStack(
    stackName: string,
    retainResources?: string[]
): Promise<void | Error> {
    if (!stackName || stackName === '') {
        return new Error('Stack name cannot be empty')
    }
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
            RetainResources: retainResources,
        }

        if (process.env.CDK_CLEANUP_ROLE_ARN) {
            console.info(
                `Using role for deletion: ${process.env.CDK_CLEANUP_ROLE_ARN}`
            )
            deleteParams.RoleARN = process.env.CDK_CLEANUP_ROLE_ARN
        } else {
            console.info(
                `Deleting stack using caller credentials (no role override)`
            )
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

// Only run when executed directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}
