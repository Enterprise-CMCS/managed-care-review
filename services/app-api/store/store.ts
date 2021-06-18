import DynamoDB from 'aws-sdk/clients/dynamodb'
import { DataMapper } from '@aws/dynamodb-data-mapper'

import {
    InsertDraftSubmissionArgsType,
    insertDraftSubmission,
} from './insertDraftSubmission'
import {
    findDraftSubmission,
    findDraftSubmissionByStateNumber,
} from './findDraftSubmission'
import { updateStateSubmission } from './updateStateSubmission'
import { findProgram } from './findProgram'
import { StoreError } from './storeError'
import {
    DraftSubmissionType,
    StateSubmissionType,
    ProgramT,
} from '../../app-web/src/common-code/domain-models'
import { updateDraftSubmission } from './updateDraftSubmission'
import { findStateSubmission } from './findStateSubmission'
import { findAllSubmissions } from './findAllSubmissions'

export type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<DraftSubmissionType | StoreError>

    findAllSubmissions: (
        stateCode: string
    ) => Promise<(DraftSubmissionType | StateSubmissionType)[] | StoreError>

    findDraftSubmission: (
        draftUUID: string
    ) => Promise<DraftSubmissionType | undefined | StoreError>
    findDraftSubmissionByStateNumber: (
        stateCoder: string,
        stateNumber: number
    ) => Promise<DraftSubmissionType | undefined | StoreError>

    updateDraftSubmission: (
        draftSubmission: DraftSubmissionType
    ) => Promise<DraftSubmissionType | StoreError>

    findStateSubmission: (
        draftUUID: string
    ) => Promise<StateSubmissionType | undefined | StoreError>

    updateStateSubmission: (
        stateSubmission: StateSubmissionType
    ) => Promise<StateSubmissionType | StoreError>

    findProgram: (stateCode: string, programID: string) => ProgramT | undefined
}

export function storeWithDynamoConfig(
    config: DynamoDB.ClientConfiguration,
    tablePrefix: string
): Store {
    const conn = new DynamoDB(config)
    const mapper = new DataMapper({
        client: conn,
        tableNamePrefix: tablePrefix,
    })

    return {
        findAllSubmissions: (stateCode) =>
            findAllSubmissions(mapper, stateCode),
        insertDraftSubmission: (args) => insertDraftSubmission(mapper, args),
        findDraftSubmission: (draftUUID) =>
            findDraftSubmission(mapper, draftUUID),
        findDraftSubmissionByStateNumber: (stateCode, stateNumber) =>
            findDraftSubmissionByStateNumber(mapper, stateCode, stateNumber),
        updateDraftSubmission: (draftSubmission) =>
            updateDraftSubmission(mapper, draftSubmission),
        updateStateSubmission: (submissionID) =>
            updateStateSubmission(mapper, submissionID),
        findStateSubmission: (submissionID) =>
            findStateSubmission(mapper, submissionID),
        findProgram: findProgram,
    }
}

export function newDeployedStore(region: string, tablePrefix: string): Store {
    const config = {
        region,
    }

    return storeWithDynamoConfig(config, tablePrefix)
}

export function newLocalStore(dyanmoURL: string): Store {
    const config = {
        region: 'localhost',
        endpoint: dyanmoURL,
        accessKeyId: 'LOCAL_FAKE_KEY',
        secretAccessKey: 'LOCAL_FAKE_SECRET',
    }

    return storeWithDynamoConfig(config, 'local-')
}
