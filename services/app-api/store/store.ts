import DynamoDB from 'aws-sdk/clients/dynamodb'
import {
    StoreError,
    InsertDraftSubmissionArgsType,
    insertDraftSubmission,
} from './insertDraftSubmission'
import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

export type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<DraftSubmissionType | StoreError>
}

export function storeWithDynamoConfig(
    config: DynamoDB.ClientConfiguration
): Store {
    const conn = new DynamoDB(config)

    return {
        insertDraftSubmission: (args) => insertDraftSubmission(conn, args),
    }
}

export function newDeployedStore(region: string): Store {
    const config = {
        region,
    }

    return storeWithDynamoConfig(config)
}

export function newLocalStore(dyanmoURL: string): Store {
    const config = {
        region: 'localhost',
        endpoint: dyanmoURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',
    }

    return storeWithDynamoConfig(config)
}
