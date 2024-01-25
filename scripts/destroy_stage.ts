import {
    CloudFormationClient,
    DeleteStackCommand,
    DescribeStacksCommand,
    DescribeStackResourcesCommand,
    StackResource,
} from '@aws-sdk/client-cloudformation'
import {
    S3Client,
    ListObjectVersionsCommand,
    DeleteObjectsCommand,
    PutBucketVersioningCommand,
    PutBucketVersioningCommandInput,
} from '@aws-sdk/client-s3'

const AWSConfig = {
    region: 'us-east-1',
}

const stackPrefixes = [
    'app-web',
    'app-api',
    'ui-auth',
    'uploads',
    'postgres',
    'storybook',
    'infra-api',
    'ui',
    'github-oidc',
]

const protectedStages = [
    'develop',
    'main',
    'master',
    'impl',
    'val',
    'prod',
    'production',
]

const stage = process.argv[2]

const cf = new CloudFormationClient(AWSConfig)
const s3 = new S3Client(AWSConfig)

async function main() {
    if (protectedStages.includes(stage)) {
        console.info(`Stage ${stage} is protected. Aborting destroy.`)
        process.exit(1)
    }

    try {
        const stacksToDestroy = await getStacksFromStage(stage)
        if (process.env.CI === 'true' && stacksToDestroy.length === 0) {
            console.warn(
                `We're in CI and there are no stacks to destroy. Alerting.`
            )
            process.exit(1)
        }
        if (stacksToDestroy.length === 0) {
            console.info(`No stacks to destroy. Skipping destroy.`)
            process.exit(0)
        }

        console.info(
            `Getting ready to remove the following stacks: ${stacksToDestroy}`
        )

        // AWS can rate limit us if we go too fast. Using a regular
        // for construct to wait on async to slow us down a bit.
        for (const stack of stacksToDestroy) {
            console.info(`Destroying stack: ${stack}`)

            const clearBucketOutput = await clearServerlessDeployBucket(stack)
            if (clearBucketOutput instanceof Error) {
                // We don't process.exit(1) here because sometimes buckets in a stack
                // have already been removed. We can still delete the stack.
                console.info(`Could not clear buckets in ${stack}`)
            }

            const deleteStackOutput = await deleteStack(stack)
            if (deleteStackOutput instanceof Error) {
                console.info(`Could not delete ${stack}. ${deleteStackOutput}`)
                continue
            }

            console.info(`Destroy successful: ${stack}`)
        }
    } catch (err) {
        console.error(`Destroy was not successful: ${err}`)
        process.exit(1)
    }
}

async function getStacksFromStage(stageName: string): Promise<string[]> {
    let stacksToDestroy: string[] = []
    for (const prefix of stackPrefixes) {
        const stackName = `${prefix}-${stageName}`
        try {
            const commandDescribeStacks = new DescribeStacksCommand({
                StackName: stackName,
            })
            const stacks = await cf.send(commandDescribeStacks)
            if (stacks.Stacks == undefined) {
                console.info(`Stack ${stackName} was not found. Skipping`)
                continue
            }

            // type guard
            const isStack = (stack: string | undefined): stack is string => {
                return !!stack
            }

            const types = stacks?.Stacks?.map((stack) => {
                return stack.StackName
            }).filter(isStack)

            stacksToDestroy.push(...types)
        } catch (err) {
            console.error(`getStacksFromStage ${err}. Skipping.`)
        }
    }
    return stacksToDestroy
}

interface s3ObjectKey {
    Key: string
    VersionId?: string
}

async function clearServerlessDeployBucket(
    stackName: string
): Promise<void | Error> {
    // find all the buckets in our stack
    const buckets = await getBucketsInStack(stackName)
    if (buckets instanceof Error) {
        return new Error(
            `Could not get buckets in stack ${stackName}: ${buckets}`
        )
    }

    // clean out each of those buckets
    const clearBucketOutput = await Promise.all(
        buckets.map(async (bucket) => {
            // turn off versioning on the bucket
            const versionResponse = await turnOffVersioningOnBucket(bucket)
            if (versionResponse instanceof Error) {
                return versionResponse
            }

            // get all the versioned files in the bucket
            console.info(`Clearing bucket: ${bucket.PhysicalResourceId}`)
            const keys = await getVersionedFilesInBucket(bucket)
            if (keys instanceof Error) {
                return keys
            }

            return await deleteKeysFromS3Bucket(bucket, keys)
        })
    )

    clearBucketOutput.filter((output) => output instanceof Error)
    if (clearBucketOutput.length > 0) {
        return new Error(
            `Encountered errors while clearing buckets: ${clearBucketOutput}`
        )
    }
}

async function deleteKeysFromS3Bucket(
    bucket: StackResource,
    keys: s3ObjectKey[]
): Promise<void | Error> {
    // deleteObjects is limited to 1000 keys per request
    const keysArray = Array.from(
        { length: Math.ceil(keys.length / 999) },
        (v, i) => keys.slice(i * 999, i * 999 + 999)
    )

    const emptyBucketOutput = await Promise.all(
        keysArray.map(async function (k) {
            // construct the delete params
            const commandDeleteObjects = new DeleteObjectsCommand({
                Bucket: bucket.PhysicalResourceId ?? '',
                Delete: {
                    Objects: k,
                },
            })

            try {
                await s3.send(commandDeleteObjects)
            } catch (err) {
                return new Error(`Could not delete keys: ${err}`)
            }
        })
    )
    emptyBucketOutput.filter((output) => output instanceof Error)
    if (emptyBucketOutput.length > 0) {
        return new Error(
            `Encountered errors while deleting keys: ${emptyBucketOutput}`
        )
    }
}

async function getBucketsInStack(
    stackName: string
): Promise<StackResource[] | Error> {
    // get all the resources in the stack
    try {
        const commandDescribeStackResources = new DescribeStackResourcesCommand(
            {
                StackName: stackName,
            }
        )
        const stack = await cf.send(commandDescribeStackResources)

        if (stack.StackResources === undefined) {
            return new Error('could not find stack')
        } else {
            // filter the resources to get our S3 buckets
            return stack.StackResources.filter((resource) => {
                return resource.ResourceType === 'AWS::S3::Bucket'
            })
        }
    } catch (err) {
        return new Error(`Could not get stack resources: ${err}`)
    }
}

async function turnOffVersioningOnBucket(
    bucket: StackResource
): Promise<void | Error> {
    console.info(
        `Turning off bucket versioning on bucket: ${bucket.PhysicalResourceId}`
    )

    const versionParams: PutBucketVersioningCommandInput = {
        Bucket: bucket.PhysicalResourceId ?? '',
        VersioningConfiguration: { Status: 'Suspended' },
    }

    try {
        const commandPutBucketVersioning = new PutBucketVersioningCommand(
            versionParams
        )
        await s3.send(commandPutBucketVersioning)
    } catch (err) {
        return new Error(`Could not turn off bucket versioning: ${err}`)
    }
}

async function getVersionedFilesInBucket(
    bucket: StackResource
): Promise<s3ObjectKey[] | Error> {
    // Versioned buckets will have extra files in them, all of which
    // must be cleared out before CloudFormation can delete the bucket.
    // We have to remove all the versions and any delete markers that exist.
    const bucketParams = {
        Bucket: bucket.PhysicalResourceId ?? '',
    }

    // get all versioned objects
    let versionKeys: s3ObjectKey[] = []
    let deleteMarkerKeys: s3ObjectKey[] = []
    const commandListObjectVersions = new ListObjectVersionsCommand(
        bucketParams
    )

    try {
        const objectVersions = await s3.send(commandListObjectVersions)

        // get version keys of files
        if (
            objectVersions.Versions != undefined &&
            objectVersions.Versions?.length > 0
        ) {
            // get all the version keys of files
            versionKeys = objectVersions.Versions?.map((c) => {
                return {
                    Key: c.Key ?? '',
                    VersionId: c.VersionId ?? '',
                }
            })
        }

        // get all the delete marker keys of files
        if (
            objectVersions.DeleteMarkers != undefined &&
            objectVersions.DeleteMarkers?.length > 0
        ) {
            deleteMarkerKeys = objectVersions.DeleteMarkers?.map((c) => {
                return {
                    Key: c.Key ?? '',
                    VersionId: c.VersionId ?? '',
                }
            })
        }

        // combine the two arrays and return
        return [...versionKeys, ...deleteMarkerKeys]
    } catch (err) {
        return new Error(err)
    }
}

async function deleteStack(stackName: string): Promise<void | Error> {
    const stackParams = {
        StackName: stackName,
    }

    // find the stack and make sure we get one
    const commandDescribeStacks = new DescribeStacksCommand(stackParams)

    try {
        const stack = await cf.send(commandDescribeStacks)

        if (stack.Stacks === undefined || stack.Stacks.length === 0) {
            return new Error(`Could not find stack ${stackName}`)
        }

        console.info(`deleteStack: Deleting stack ${stackName}`)
        // get the stack ID so we can check it's status

        let stackId = stack.Stacks[0].StackId
    } catch (err) {
        return new Error('Error on deleteStack: ' + err)
    }

    try {
        const commandDeleteStack = new DeleteStackCommand(stackParams)
        await cf.send(commandDeleteStack)

        // deleteStack just returns {} if successful, so:
        console.info(`deleteStack: Stack ${stackName} deleted`)
    } catch (err) {
        return new Error('Error on deleteStack: ' + err)
    }
}

// run the script
main()
