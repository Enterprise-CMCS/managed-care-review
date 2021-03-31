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

// TODO
// allow configuration
// try with the bare db commands to do a find and see if that returns quick.

export function newDeployedStore(region: string): Store {
    const config = {
        region,

        maxRetries: 1, // TODO REMOVE ME
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
