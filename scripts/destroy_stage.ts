import AWS from 'aws-sdk'

AWS.config.update({
    region: 'us-east-1',
})

const stackPrefixes = [
    'app-web',
    'app-api',
    'ui-auth',
    'uploads',
    'postgres',
    'storybook',
    'infra-api',
    'ui',
]

const stage = process.argv[2]

const cf = new AWS.CloudFormation()
const s3 = new AWS.S3()

async function main() {
    const stacksToDestroy = await getStacksFromStage(stage)
    stacksToDestroy.map(async (sn) => {
        console.log(`Destroying stack: ${sn}`)

        try {
            const clearBucketOutput = await clearServerlessDeployBucket(sn)
            if (clearBucketOutput instanceof Error) {
                console.log(clearBucketOutput)
            }
        } catch (err) {
            console.log(`Could not clear bucket: ${err}`)
        }

        try {
            const deleteStackOutput = await deleteStack(sn)
            if (deleteStackOutput instanceof Error) {
                console.log(deleteStackOutput)
            }
        } catch (err) {
            console.log(`Could not delete stack: ${err}`)
        }
    })
}

async function getStacksFromStage(stageName: string): Promise<string[]> {
    const stacks = await Promise.all(
        stackPrefixes.map(async (prefix) => {
            const stackName = `${prefix}-${stageName}`
            try {
                const stacks = await cf
                    .describeStacks({ StackName: stackName })
                    .promise()

                if (
                    stacks.$response.error != null ||
                    typeof stacks.Stacks === 'undefined'
                ) {
                    console.log(`Stack ${stackName} does not exist. Skipping.`)
                    return []
                }

                // type guard
                const isStack = (
                    stack: string | undefined
                ): stack is string => {
                    return !!stack
                }

                const types = stacks?.Stacks?.map((stack) => {
                    return stack.StackName
                }).filter(isStack)

                return types
            } catch (err) {
                console.log(`Stack ${stackName} does not exist. Skipping.`)
                return []
            }
        })
    )
    return stacks.flat()
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
    buckets.map(async (bucket) => {
        // turn off versioning on the bucket
        const versionResponse = await turnOffVersioningOnBucket(bucket)
        if (versionResponse instanceof Error) {
            return versionResponse
        }

        // get all the versioned files in the bucket
        console.log(`Clearing bucket: ${bucket.PhysicalResourceId}`)
        const keys = await getVersionedFilesInBucket(bucket)
        if (keys instanceof Error) {
            return keys
        }

        try {
            // construct the delete
            const deleteParams: AWS.S3.DeleteObjectsRequest = {
                Bucket: bucket.PhysicalResourceId ?? '',
                Delete: {
                    Objects: keys,
                },
            }

            // delete all the files, including their versions
            const deleteObjectsResponse = await s3
                .deleteObjects(deleteParams)
                .promise()

            if (deleteObjectsResponse.$response.error != null) {
                return new Error(
                    `Error on deleteObjects: ${deleteObjectsResponse.$response.error}`
                )
            }
        } catch (err) {
            return new Error(
                `Error clearing bucket: ${bucket.PhysicalResourceId}: ${err}`
            )
        }
    })
}

async function getBucketsInStack(
    stackName: string
): Promise<AWS.CloudFormation.StackResource[] | Error> {
    // get all the resources in the stack
    try {
        const stack = await cf
            .describeStackResources({ StackName: stackName })
            .promise()

        if (stack.StackResources === undefined) {
            return new Error('could not find stack')
        }

        // filter the resources to get our S3 buckets
        return stack.StackResources.filter((resource) => {
            return resource.ResourceType === 'AWS::S3::Bucket'
        })
    } catch (err) {
        return new Error(`Could not get stack resources: ${err}`)
    }
}

async function turnOffVersioningOnBucket(
    bucket: AWS.CloudFormation.StackResource
): Promise<void | Error> {
    console.log(
        `Turning off bucket versioning on bucket: ${bucket.PhysicalResourceId}`
    )

    const versionParams = {
        Bucket: bucket.PhysicalResourceId ?? '',
        VersioningConfiguration: { Status: 'Suspended' },
    }

    try {
        await s3.putBucketVersioning(versionParams).promise()
    } catch (err) {
        return new Error(`Could not turn off bucket versioning: ${err}`)
    }
}

async function getVersionedFilesInBucket(
    bucket: AWS.CloudFormation.StackResource
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

    const objectVersions = await s3.listObjectVersions(bucketParams).promise()
    // AWSError is unfortunately not backed by Error, so we can't just
    // check it is an instanceof, we don't get good type info :(
    // https://github.com/aws/aws-sdk-js/issues/2611
    if (objectVersions.$response.error != null) {
        return new Error(
            'Error on listObjectVersions: ' +
                objectVersions.$response.error.message
        )
    }

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
}

async function deleteStack(stackName: string): Promise<void | Error> {
    console.log(`deleteStack: Looking up stack ${stackName}`)
    const stackParams = {
        StackName: stackName,
    }

    // find the stack and make sure we get one
    const stack = await cf.describeStacks(stackParams).promise()

    // AWSError is unfortunately not backed by Error, so we can't just
    // check it is an instanceof, we don't get good type info :(
    // https://github.com/aws/aws-sdk-js/issues/2611
    if (stack.$response.error != null) {
        return new Error(
            'Error on describeStacks: ' + stack.$response.error.message
        )
    }

    if (stack.Stacks === undefined || stack.Stacks.length === 0) {
        return new Error(`Could not find stack ${stackName}`)
    }

    console.log(`deleteStack: Deleting stack ${stackName}`)
    // get the stack ID so we can check it's status

    let stackId = stack.Stacks[0].StackId

    try {
        await cf.deleteStack(stackParams).promise()
    } catch (err) {
        return new Error('Error on deleteStack: ' + err)
    }

    try {
        await cf
            .waitFor('stackDeleteComplete', { StackName: stackId })
            .promise()
    } catch (err) {
        return new Error('Error on waitFor: ' + err.message)
    }

    // deleteStack just returns {} if successful, so:
    console.log(`deleteStack: Stack ${stackName} deleted`)
}

// run the script
main()
