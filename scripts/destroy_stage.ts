import AWS from 'aws-sdk'
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders'
import { version } from 'prettier'

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

await Promise.all(
    stackPrefixes.map(async (prefix) => {
        try {
            const sn = `${prefix}-${stage}`
            await clearServerlessDeployBucket(sn)
            await deleteStack(sn)
            return
        } catch (err) {
            return Promise.reject(err)
        }
    })
)

interface s3ObjectKey {
    Key: string
    VersionId?: string
}

async function clearServerlessDeployBucket(stackName: string) {
    const stackParams = {
        StackName: stackName,
    }

    try {
        // get all the resources in the stack
        const stack = await cf.describeStackResources(stackParams).promise()
        if (stack.StackResources === undefined) {
            console.log('could not find stack')
            return
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
    } catch (err) {
        return Promise.reject(err)
    }
}

async function deleteStack(stackName: string): Promise<void> {
    console.log(`Deleting stack ${stackName}`)
    const stackParams = {
        StackName: stackName,
    }

    try {
        // find the stack and make sure we get one
        const stack = await cf.describeStacks(stackParams).promise()
        if (stack.Stacks === undefined) {
            console.log('could not find stack')
            return
        }
        console.log(stack.Stacks[0].Outputs)

        // get the stack ID so we can check it's status
        let stackId = stack.Stacks[0].StackId
        await cf.deleteStack(stackParams).promise()
        await cf
            .waitFor('stackDeleteComplete', { StackName: stackId })
            .promise()
    } catch (err) {
        return Promise.reject(err)
    }
}
