import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

import {
    CloudFormationClient,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'

import * as fs from 'fs'

const stages = ['dev', 'val', 'prod', 'main']
const files = ['vm-startup.sh', 'vm-shutdown.sh', 'slack-notify.service']

let bucketName: string

async function main() {
    if (process.argv.length === 2) {
        console.error('You must pass the stage to uploadScripts. Exiting.')
        process.exit(1)
    }

    const stage = process.argv[2] ?? 'unset'
    if (!stages.includes(stage)) {
        console.info(`Stage is ${stage}. Skipping postgres VM deployment`)
        return
    }
    const client = new CloudFormationClient({ region: 'us-east-1' })
    const command = new DescribeStacksCommand({
        StackName: 'postgres-' + stage,
    })

    try {
        const data = await client.send(command)
        if (data.Stacks === undefined) {
            const err = `Error with cloudformation fetch. describeStacksOutputCommand is undefined`
            console.error(err)
            throw new Error(err)
        }

        const outputs = data.Stacks[0].Outputs
        if (outputs === undefined) {
            const err = `Error with cloudformation fetch. stack Output is undefined.`
            console.error(err)
            throw new Error(err)
        }
        const bucketFindValue = outputs.find(
            (o) => o.OutputKey === 'PostgresVMScriptsBucket'
        )
        if (bucketFindValue == undefined) {
            const err = `Could not find bucket output PostgresVMScriptsBucket`
            console.error(err)
            throw new Error(err)
        }
        if (bucketFindValue.OutputValue === undefined) {
            const err = `Could not get bucket OutputValue`
            console.error(err)
            throw new Error(err)
        }
        bucketName = bucketFindValue.OutputValue
        console.log(bucketName)
    } catch (err) {
        console.error(err)
    }

    const s3 = new S3Client({ region: 'us-east-1' })
    for (const file of files) {
        const fileStream = fs.createReadStream('scripts/' + file)

        if (bucketName == undefined) {
            const errMsg = 'Could not get the PostgresVMScriptsBucket name'
            console.error(errMsg)
            throw new Error(errMsg)
        }

        const params = {
            Bucket: bucketName,
            Key: `scripts/${file.split('/').pop()}`,
            Body: fileStream,
        }

        try {
            const command = new PutObjectCommand(params)
            const response = await s3.send(command)
            console.log(`Successfully uploaded ${file} to S3:`, response)
        } catch (err) {
            console.error(`Error uploading ${file} to S3:`, err)
        }
    }
}

main()
