import DynamoDB from 'aws-sdk/clients/dynamodb'
import { DataMapper } from '@aws/dynamodb-data-mapper'
import { v4 as uuidv4 } from 'uuid'

import { StoreError } from './storeError'

import {
    DraftSubmissionType,
    SubmissionType,
} from '../../app-web/src/common-code/domain-models'

export async function findDraftSubmission(
    conn: DynamoDB,
    draftUUID: string
): Promise<DraftSubmissionType | undefined | StoreError> {
    throw new Error('Not Implemented')
}
