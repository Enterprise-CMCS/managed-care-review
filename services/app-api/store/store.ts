import DynamoDB from 'aws-sdk/clients/dynamodb'

export function newLocalStoreConnection(dyanmoURL: string): DynamoDB {
    const config = {
        region: 'localhost',
        endpoint: dyanmoURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',
        maxRetries: 1,
    }

    return new DynamoDB(config)
}
