import AWS from 'aws-sdk'

AWS.config.update({
    region: 'us-east-1',
})
/*
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
*/

const stackPrefixes = ['app-web']

const stage = process.argv[2]

const cf = new AWS.CloudFormation()
const s3 = new AWS.S3()

async function main() {
    Promise.all(
        stackPrefixes.map(async (prefix) => {
            try {
                const sn = `${prefix}-${stage}`
                const clearBucketOutput = await clearServerlessDeployBucket(sn)
                if (clearBucketOutput instanceof Error) {
                    console.log(clearBucketOutput)
                }
                const deleteStackOutput = await deleteStack(sn)
                if (deleteStackOutput instanceof Error) {
                    console.log(deleteStackOutput)
                }

                return
            } catch (err) {
                return Promise.reject(err)
            }
        })
    )
}

interface s3ObjectKey {
    Key: string
    VersionId?: string
}

async function clearServerlessDeployBucket(
    stackName: string
): Promise<{} | Error> {
    const stackParams = {
        StackName: stackName,
    }

    // get all the resources in the stack
    const stack = await cf.describeStackResources(stackParams).promise()
    if (stack.StackResources === undefined) {
        return new Error('could not find stack')
    }
    // filter the resources to get our S3 buckets
    const buckets = stack.StackResources.filter((resource) => {
        return resource.ResourceType === 'AWS::S3::Bucket'
    })

    // TODO: Suspend bucket versioning.

    // clean out each of those buckets
    buckets.map(async (bucket) => {
        console.log(`Deleting ${bucket.PhysicalResourceId}`)
        const bucketParams = {
            Bucket: bucket.PhysicalResourceId ?? '',
        }
        const objects = await s3.listObjects(bucketParams).promise()

        if (objects.Contents === undefined) {
            return
        }

        if (objects.Contents?.length > 0) {
            const keys: s3ObjectKey[] = objects.Contents?.map((c) => {
                return { Key: c.Key ?? '' }
            })

            const deleteParams: AWS.S3.DeleteObjectsRequest = {
                Bucket: bucket.PhysicalResourceId ?? '',
                Delete: {
                    Objects: keys,
                },
            }

            await s3.deleteObjects(deleteParams).promise()
        }
    })

    return {}
}

async function deleteStack(stackName: string): Promise<{} | Error> {
    console.log(`Looking up up stack ${stackName}`)
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

    console.log(stack.Stacks[0].Outputs)

    console.log(`Deleting stack ${stackName}`)
    // get the stack ID so we can check it's status
    let stackId = stack.Stacks[0].StackId
    const deleteReturn = await cf.deleteStack(stackParams).promise()
    if (deleteReturn.$response.error != null) {
        return new Error(
            'Error on deleteStack: ' + deleteReturn.$response.error.message
        )
    }

    await cf.waitFor('stackDeleteComplete', { StackName: stackId }).promise()

    // deleteStack just returns {} if successful, so:
    return {}
}

// run the script
main()
