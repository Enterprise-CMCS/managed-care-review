import AWS from 'aws-sdk'

async function getBulkDownloadURL(
    config: BulkDLConfiguration
): Promise<string | Error> {
    const bulkDLFunc = new AWS.Lambda()
    const zipRequestParams = {
        keys: config.keys,
        bucket: config.bucket,
    }

    const lambdaParams = {
        FunctionName: `app-api-${config.stage}-zip_keys`,
        Payload: JSON.stringify({ body: zipRequestParams }),
    }

    try {
        const dlURL = await bulkDLFunc.invoke(lambdaParams).promise()
        console.log('success: zip of files on s3 completed.')
        return dlURL.Payload as string
    } catch (err) {
        return new Error('Could not get a bulk DL URL' + err)
    }
}

type BulkDLConfiguration = {
    stage: string
    keys: string[]
    bucket: string
}
