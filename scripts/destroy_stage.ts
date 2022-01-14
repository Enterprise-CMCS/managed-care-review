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

let cf = new AWS.CloudFormation()

await Promise.all(
    stackPrefixes.map(async (prefix) => {
        try {
            const sn = `${prefix}-${stage}`
            deleteStack(sn)
            return
        } catch (err) {
            return Promise.reject(err)
        }
    })
)

async function deleteStack(stackName: string) {
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

        // get the stack ID so we can check it's status
        let stackId = stack.Stacks[0].StackId
        await cf.deleteStack(stackParams).promise()
        await cf
            .waitFor('stackDeleteComplete', { StackName: stackId })
            .promise()
    } catch (err) {
        console.log(err)
    }
}
