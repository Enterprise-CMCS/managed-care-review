import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError, convertDynamoErrorToStoreError } from './storeError'
import {
    StateSubmissionStoreType,
    isDynamoError,
    DocumentStoreT,
} from './dynamoTypes'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'

export async function updateStateSubmission(
    mapper: DataMapper,
    stateSubmission: StateSubmissionType
): Promise<StateSubmissionType | StoreError> {
    // Copy over the values to our db model
    const storeSubmission = new StateSubmissionStoreType()

    storeSubmission.id = stateSubmission.id
    storeSubmission.createdAt = stateSubmission.createdAt
    storeSubmission.updatedAt = new Date()

    // these args carry over but aren't set explicitly
    storeSubmission.stateCode = stateSubmission.stateCode
    storeSubmission.stateNumber = stateSubmission.stateNumber

    // SOME args can be set, others must be kept
    storeSubmission.submissionType = stateSubmission.submissionType
    storeSubmission.programID = stateSubmission.programID
    storeSubmission.submissionDescription =
        stateSubmission.submissionDescription

    stateSubmission.documents.forEach((doc) => {
        const storeDocument = new DocumentStoreT()
        storeDocument.name = doc.name
        storeDocument.s3URL = doc.s3URL
        storeSubmission.documents.push(storeDocument)
    })

    // new fields
    storeSubmission.submittedAt = new Date()

    try {
        const putResult = await mapper.put(storeSubmission)
        return putResult
    } catch (err) {
        if (isDynamoError(err)) {
            return convertDynamoErrorToStoreError(err.code)
        }
        throw new Error(`Unexpected - ${err}`)
    }
}
