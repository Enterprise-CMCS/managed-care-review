import {
    CloudFormationClient,
    DescribeStacksCommand,
    DescribeStackResourcesCommand,
    ListStacksCommand,
    StackStatus,
} from '@aws-sdk/client-cloudformation'
import { S3Client, DeleteBucketCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import {
    emptyS3Bucket,
    deleteStack,
    waitForDistributionInvalidations,
} from './destroy-cdk.js'

const AWSConfig = {
    region: 'us-east-1',
}

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

const cloudformationClient = new CloudFormationClient(AWSConfig)
const s3Client = new S3Client(AWSConfig)

const clearBucketMode = process.argv[2] === '--cleanup-bucket'
const clearBucketName = clearBucketMode ? process.argv[3] : undefined
const cleanupMode = process.argv[2] === '--cleanup-failed'
const stage = cleanupMode ? process.argv[3] : undefined

async function main() {
    // If --cleanup-failed flag is passed, run cleanup mode for existing DELETE_FAILED stacks
    if (cleanupMode) {
        await cleanupFailedStacks(stage ?? '')
        process.exit(0)
    }

    // If --cleanup-bucket flag is passed, empty the specified bucket and exit
    if (clearBucketMode) {
        if (!clearBucketName) {
            console.error(
                'Usage: node cleanup-cdk.js --cleanup-bucket <bucket-name>'
            )
            process.exit(1)
        }
        const result = await emptyS3Bucket(clearBucketName)
        if (result instanceof Error) {
            console.error(`Failed to clear bucket: ${result.message}`)
            process.exit(1)
        }
        console.info(`Successfully cleared bucket: ${clearBucketName}`)

        console.info(`Deleting bucket: ${clearBucketName}`)
        try {
            await s3Client.send(
                new DeleteBucketCommand({ Bucket: clearBucketName })
            )
            console.info(`Successfully deleted bucket: ${clearBucketName}`)
        } catch (err: any) {
            console.error(`Failed to delete bucket: ${err.message}`)
            process.exit(1)
        }
        process.exit(0)
    }

    console.error('Usage: node cleanup-cdk.js --cleanup-failed [stage-name]')
    console.error('       node cleanup-cdk.js --cleanup-bucket <bucket-name>')
    console.error(
        '  --cleanup-failed [stage]  Clean up existing DELETE_FAILED stacks (optionally filtered by stage)'
    )
    console.error(
        '  --cleanup-bucket <name>   Empty all objects and versions from the specified S3 bucket'
    )
    process.exit(1)
}

/**
 * Get the current status of a CloudFormation stack
 */
async function getStackStatus(stackName: string): Promise<string | Error> {
    try {
        const command = new DescribeStacksCommand({ StackName: stackName })
        const response = await cloudformationClient.send(command)

        if (!response.Stacks || response.Stacks.length === 0) {
            return new Error(`Stack ${stackName} not found`)
        }

        return response.Stacks[0].StackStatus ?? 'UNKNOWN'
    } catch (err: any) {
        return new Error(`Could not get stack status: ${err.message}`)
    }
}

/**
 * Get resources that failed to delete from a stack
 */
async function getFailedResources(stackName: string): Promise<
    | Array<{
          logicalId: string
          physicalId: string
          resourceType: string
          statusReason: string
      }>
    | Error
> {
    try {
        const command = new DescribeStackResourcesCommand({
            StackName: stackName,
        })
        const response = await cloudformationClient.send(command)

        if (!response.StackResources) {
            return new Error(`No resources found for stack ${stackName}`)
        }

        // Filter for resources that failed to delete
        const failedResources = response.StackResources.filter(
            (resource) => resource.ResourceStatus === 'DELETE_FAILED'
        ).map((resource) => ({
            logicalId: resource.LogicalResourceId ?? 'UNKNOWN',
            physicalId: resource.PhysicalResourceId ?? 'UNKNOWN',
            resourceType: resource.ResourceType ?? 'UNKNOWN',
            statusReason: resource.ResourceStatusReason ?? 'No reason provided',
        }))

        return failedResources
    } catch (err: any) {
        return new Error(`Could not get failed resources: ${err.message}`)
    }
}

/**
 * Handle a stack that is in DELETE_FAILED status
 * - For S3 buckets: empty the bucket and retry deletion
 * - For other resources: log and skip (retain the resource)
 */
type RetainedResource = {
    stackName: string
    logicalId: string
    resourceType: string
    physicalId: string
    statusReason: string
}

async function handleDeleteFailedStack(
    stackName: string,
    attempts: number
): Promise<RetainedResource[] | Error> {
    console.info(`Checking if stack ${stackName} is in DELETE_FAILED status...`)

    const status = await getStackStatus(stackName)
    if (status instanceof Error) {
        // Stack might have been deleted successfully
        if (status.message.includes('does not exist')) {
            console.info(`Stack ${stackName} was deleted successfully`)
            return []
        }
        return status
    }

    if (status !== 'DELETE_FAILED') {
        console.info(
            `Stack ${stackName} is not in DELETE_FAILED status (current: ${status})`
        )
        return []
    }

    console.info(
        `Stack ${stackName} is in DELETE_FAILED status. Analyzing failed resources...`
    )

    const failedResources = await getFailedResources(stackName)
    if (failedResources instanceof Error) {
        return failedResources
    }

    if (failedResources.length === 0) {
        console.info(`No failed resources found in stack ${stackName}`)
        return []
    }

    console.info(
        `Found ${failedResources.length} failed resource(s) in stack ${stackName}`
    )

    const resourcesToRetain: string[] = []

    for (const resource of failedResources) {
        console.info(`  - ${resource.resourceType}: ${resource.physicalId}`)
        console.info(`    Reason: ${resource.statusReason}`)

        if (resource.resourceType === 'AWS::S3::Bucket') {
            console.info(
                `    Attempting to empty S3 bucket: ${resource.physicalId}`
            )
            const emptyResult = await emptyS3Bucket(resource.physicalId)
            if (emptyResult instanceof Error) {
                console.error(
                    `    Could not empty bucket ${resource.physicalId}: ${emptyResult.message}`
                )
                if (attempts >= 3) {
                    resourcesToRetain.push(resource.logicalId)
                }
            }
            // Don't add to resourcesToRetain - we want CloudFormation to retry deleting it
        } else if (resource.resourceType === 'AWS::CloudFront::Distribution') {
            console.info(
                `    Waiting for CloudFront invalidations to complete: ${resource.physicalId}`
            )
            const waitResult = await waitForDistributionInvalidations(
                resource.physicalId
            )
            if (waitResult instanceof Error) {
                console.error(
                    `    Could not wait for invalidations on ${resource.physicalId}: ${waitResult.message}`
                )
                resourcesToRetain.push(resource.logicalId)
            }
            // Don't add to resourcesToRetain - we want CloudFormation to retry deleting it
        } else {
            console.warn(
                `    Cannot auto-clean resource type ${resource.resourceType}. Will retain.`
            )
            resourcesToRetain.push(resource.logicalId)
        }
    }

    // Retry stack deletion
    console.info(`Retrying deletion of stack ${stackName}...`)
    const forceDeleteResult = await deleteStack(stackName, resourcesToRetain)
    if (forceDeleteResult instanceof Error) {
        return forceDeleteResult
    }

    console.info(`Successfully cleaned up stack ${stackName}`)

    const retained = failedResources
        .filter((r) => resourcesToRetain.includes(r.logicalId))
        .map((r) => ({
            stackName,
            logicalId: r.logicalId,
            resourceType: r.resourceType,
            physicalId: r.physicalId,
            statusReason: r.statusReason,
        }))

    if (retained.length > 0) {
        console.warn(
            `  ${retained.length} resource(s) retained from stack ${stackName}:`
        )
        for (const resource of retained) {
            console.warn(`    - Logical ID:   ${resource.logicalId}`)
            console.warn(`      Type:         ${resource.resourceType}`)
            console.warn(`      Physical ID:  ${resource.physicalId}`)
            console.warn(`      Reason:       ${resource.statusReason}`)
        }
    }

    return retained
}

/**
 * Clean up existing DELETE_FAILED stacks for a stage (or all if no stage specified)
 * This can be run standalone to clean up stacks that failed in CI
 */
async function cleanupFailedStacks(stageName?: string): Promise<void> {
    console.info(
        `Searching for DELETE_FAILED stacks${stageName ? ` for stage: ${stageName}` : ''}...`
    )

    try {
        // List all stacks in DELETE_FAILED status, paginating through all results
        const allStackSummaries = []
        let nextToken: string | undefined
        do {
            const command = new ListStacksCommand({
                StackStatusFilter: [StackStatus.DELETE_FAILED],
                NextToken: nextToken,
            })
            const response = await cloudformationClient.send(command)
            if (response.StackSummaries) {
                allStackSummaries.push(...response.StackSummaries)
            }
            nextToken = response.NextToken
            if (nextToken) {
                console.info(
                    `Fetching next page of stacks (${allStackSummaries.length} found so far)...`
                )
            }
        } while (nextToken)

        if (allStackSummaries.length === 0) {
            console.info('No DELETE_FAILED stacks found')
            return
        }

        // Filter by stage if provided
        let stacksToClean = allStackSummaries
        if (stageName) {
            stacksToClean = stacksToClean.filter((stack) =>
                stack.StackName?.includes(`-${stageName}-`)
            )
        }

        if (stacksToClean.length === 0) {
            console.info(
                `No DELETE_FAILED stacks found${stageName ? ` for stage ${stageName}` : ''}`
            )
            return
        }

        console.info(`Found ${stacksToClean.length} DELETE_FAILED stack(s):`)
        for (const stack of stacksToClean) {
            console.info(`  - ${stack.StackName}`)
        }

        // Process each failed stack
        const allRetainedResources: RetainedResource[] = []
        for (const stack of stacksToClean) {
            if (!stack.StackName) continue

            // Check if this is a protected stage
            const isProtected = protectedStages.some((protectedStage) =>
                stack.StackName?.includes(`-${protectedStage}-`)
            )
            if (isProtected) {
                console.warn(`Skipping protected stack: ${stack.StackName}`)
                continue
            }

            console.info(`\nProcessing failed stack: ${stack.StackName}`)
            const maxRetries = 3
            let attempt = 0
            let lastError: Error | undefined
            while (attempt < maxRetries) {
                attempt++
                if (attempt > 1) {
                    const delaySeconds = attempt * 10
                    console.info(
                        `Retry attempt ${attempt}/${maxRetries} for ${stack.StackName} (waiting ${delaySeconds}s)...`
                    )
                    await new Promise((resolve) =>
                        setTimeout(resolve, delaySeconds * 1000)
                    )
                }
                const result = await handleDeleteFailedStack(
                    stack.StackName,
                    attempt
                )
                if (!(result instanceof Error)) {
                    allRetainedResources.push(...result)
                    lastError = undefined
                    break
                }
                lastError = result
                console.warn(
                    `Attempt ${attempt}/${maxRetries} failed for ${stack.StackName}: ${result.message}`
                )
            }
            if (lastError) {
                console.error(
                    `Failed to clean up ${stack.StackName} after ${maxRetries} attempts: ${lastError.message}`
                )
            }
        }

        console.info('\nCleanup complete')

        if (allRetainedResources.length > 0) {
            console.warn(
                `\nThe following ${allRetainedResources.length} resource(s) were retained (not deleted):`
            )
            for (const resource of allRetainedResources) {
                console.warn(`  - Stack:        ${resource.stackName}`)
                console.warn(`    Logical ID:   ${resource.logicalId}`)
                console.warn(`    Type:         ${resource.resourceType}`)
                console.warn(`    Physical ID:  ${resource.physicalId}`)
                console.warn(`    Reason:       ${resource.statusReason}`)
            }
        }
    } catch (err) {
        console.error(`Error during cleanup: ${err}`)
        process.exit(1)
    }
}

// Run the script
main()
