import { DataMapper } from '@aws/dynamodb-data-mapper'
import { PrismaClient } from '@prisma/client'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import { NewPrismaClient } from '../postgres'
import { Store, storeWithDynamoConfig } from '../store/store'

async function configurePrismaClient(): Promise<PrismaClient> {
    const dbURL = process.env.DATABASE_URL

    if (!dbURL) {
        throw new Error(
            'Test Init Error: DATABASE_URL must be set to run tests'
        )
    }

    if (dbURL === 'AWS_SM') {
        throw new Error(
            'Secret Manager not supported for testing against postgres'
        )
    }

    const clientResult = await NewPrismaClient(dbURL)
    if (clientResult instanceof Error) {
        console.log('Error: ', clientResult)
        throw new Error('failed to configure postgres client for testing')
    }

    return clientResult
}

const sharedClientPromise = configurePrismaClient()

async function sharedTestPrismaClient(): Promise<PrismaClient> {
    return await sharedClientPromise
}

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

function getTestDynamoMapper(): DataMapper {
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

export { sharedTestPrismaClient, getTestDynamoMapper }
