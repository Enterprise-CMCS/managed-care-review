import DynamoDB from 'aws-sdk/clients/dynamodb'
import {
    StoreError,
    InsertDraftSubmissionArgsType,
    insertDraftSubmission,
} from './insertDraftSubmission'
import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<DraftSubmissionType | StoreError>
}

function storeWithDynamoConnection(conn: DynamoDB): Store {
    return {
        insertDraftSubmission: (args) => insertDraftSubmission(conn, args),
    }
}

export function newDeployedStore(region: string): Store {
    const config = {
        region,
    }
    const conn = new DynamoDB(config)

    return storeWithDynamoConnection(conn)
}

export function newLocalStore(dyanmoURL: string): Store {
    const config = {
        region: 'localhost',
        endpoint: dyanmoURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',
    }

    const conn = new DynamoDB(config)

    return storeWithDynamoConnection(conn)
}

export function newTestStore(dyanmoURL: string): Store {
    const config = {
        region: 'localhost',
        endpoint: dyanmoURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',

        maxRetries: 1,
    }

    const conn = new DynamoDB(config)

    return storeWithDynamoConnection(conn)
}
