import AWS from 'aws-sdk'
import { AwsAccount } from 'aws-sdk/clients/workspaces'

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
    stackPrefixes.map(async (prefix) => {
        const sn = `${prefix}-${stage}`
        const clearBucketOutput = await clearServerlessDeployBucket(sn)
        if (clearBucketOutput instanceof Error) {
            console.log(clearBucketOutput)
        }
        const deleteStackOutput = await deleteStack(sn)
        if (deleteStackOutput instanceof Error) {
            console.log(deleteStackOutput)
        }
    })
}

interface s3ObjectKey {
    Key: string
    VersionId?: string
}

async function clearServerlessDeployBucket(
    stackName: string
): Promise<{} | Error> {
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
            console.log(
                `deleted objects: ${deleteObjectsResponse.$response.data}`
            )
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

    return {}
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
): Promise<{} | Error> {
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

    return {}
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
    let allVersionKeys: s3ObjectKey[] = []
    const objectVersions = await s3.listObjectVersions(bucketParams).promise()

    // check if we have a returned versions object
    if (
        objectVersions.Versions === undefined ||
        objectVersions.DeleteMarkers === undefined
    ) {
        return new Error(`Could not find object versions in bucket`)
    }

    if (
        objectVersions.Versions?.length > 0 ||
        objectVersions.DeleteMarkers?.length > 0
    ) {
        // get all the version keys of files
        const versionKeys: s3ObjectKey[] = objectVersions.Versions?.map((c) => {
            return {
                Key: c.Key ?? '',
                VersionId: c.VersionId ?? '',
            }
        })

        // get all the delete marker keys of files
        const deleteMarkerKeys: s3ObjectKey[] =
            objectVersions.DeleteMarkers?.map((c) => {
                return {
                    Key: c.Key ?? '',
                    VersionId: c.VersionId ?? '',
                }
            })

        // combine the two arrays
        allVersionKeys = [...versionKeys, ...deleteMarkerKeys]
    }
    return allVersionKeys
}

async function deleteStack(stackName: string): Promise<{} | Error> {
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
    return {}
}

// run the script
main()
