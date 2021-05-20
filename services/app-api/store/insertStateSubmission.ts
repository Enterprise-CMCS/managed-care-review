import { DataMapper } from '@aws/dynamodb-data-mapper'
import { v4 as uuidv4 } from 'uuid'

import {
    StoreError,
    isStoreError,
    convertDynamoErrorToStoreError,
} from './storeError'
import { StateSubmissionStoreType, isDynamoError } from './dynamoTypes'
import { findDraftSubmission } from './findDraftSubmission'
import {
    StateSubmissionType,
    DraftSubmissionType,
} from '../../app-web/src/common-code/domain-models'

export type InsertStateSubmissionArgsType = {
    submissionID: string
}

export async function insertStateSubmission(
    mapper: DataMapper,
    args: InsertStateSubmissionArgsType
): Promise<StateSubmissionType | StoreError | undefined> {
    const findResult = await findDraftSubmission(mapper, args.submissionID)

    if (isStoreError(findResult)) {
        throw new Error(
            `Issue finding a draft submission of type ${findResult.code}. Message: ${findResult.message}`
        )
    }

    if (findResult == undefined) {
        return undefined
    }

    const draftSubmission: DraftSubmissionType = findResult

    const stateSubmission = new StateSubmissionStoreType()
    stateSubmission.id = uuidv4()
    stateSubmission.createdAt = draftSubmission.createdAt
    stateSubmission.updatedAt = new Date()
    stateSubmission.submissionType = draftSubmission.submissionType
    stateSubmission.programID = draftSubmission.programID
    stateSubmission.submissionDescription =
        draftSubmission.submissionDescription
    stateSubmission.stateCode = draftSubmission.stateCode
    stateSubmission.documents = draftSubmission.documents

    // new fields
    stateSubmission.submittedAt = new Date()

    try {
        const putResult = await mapper.put(stateSubmission)
        return putResult
    } catch (err) {
        if (isDynamoError(err)) {
            const errorMessage = convertDynamoErrorToStoreError(err.code)
            throw new Error(
                `Issue inserting state submission of type ${errorMessage.code}. Message: ${errorMessage.message}`
            )
        }
        throw new Error(`Unexpected - ${err}`)
    }
}
