import { DataMapper } from '@aws/dynamodb-data-mapper'
import DynamoDB from 'aws-sdk/clients/dynamodb'

import { Store, storeWithDynamoConfig } from '../store/store'

export function getTestStore(): Store {
    // we hard code this for now b/c we don't have .env loaded for these tests.
    const testURL = 'http://localhost:8000'

    const config = {
        region: 'localhost',
        endpoint: testURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',

        maxRetries: 1,
    }

    return storeWithDynamoConfig(config, 'local-')
}

export function getTestDynamoMapper(): DataMapper {
    const testURL = 'http://localhost:8000'

    const config = {
        region: 'localhost',
        endpoint: testURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',

        maxRetries: 1,
    }

    const conn = new DynamoDB(config)
    const mapper = new DataMapper({ client: conn, tableNamePrefix: 'local-' })

    return mapper
}
