import DynamoDB from 'aws-sdk/clients/dynamodb'
import {
    InsertDraftSubmissionArgsType,
    insertDraftSubmission,
} from './insertDraftSubmission'
import {
    findDraftSubmission,
    findDraftSubmissionByStateNumber,
} from './findDraftSubmission'
import { StoreError } from './storeError'
import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

export type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<DraftSubmissionType | StoreError>

    findDraftSubmission: (
        draftUUID: string
    ) => Promise<DraftSubmissionType | undefined | StoreError>
    findDraftSubmissionByStateNumber: (
        stateCoder: string,
        stateNumber: number
    ) => Promise<DraftSubmissionType | undefined | StoreError>
}

export function storeWithDynamoConfig(
    config: DynamoDB.ClientConfiguration
): Store {
    const conn = new DynamoDB(config)

    return {
        insertDraftSubmission: (args) => insertDraftSubmission(conn, args),
        findDraftSubmission: (draftUUID) =>
            findDraftSubmission(conn, draftUUID),
        findDraftSubmissionByStateNumber: (stateCode, stateNumber) =>
            findDraftSubmissionByStateNumber(conn, stateCode, stateNumber),
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
