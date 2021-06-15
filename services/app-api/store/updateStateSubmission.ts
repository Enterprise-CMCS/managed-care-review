import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError, convertDynamoErrorToStoreError } from './storeError'
import {
    StateSubmissionStoreType,
    isDynamoError,
    DocumentStoreT,
} from './dynamoTypes'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'

// Initially called when we convert a draft submission to a state submission
export async function updateStateSubmission(
    mapper: DataMapper,
    stateSubmission: StateSubmissionType
): Promise<StateSubmissionType | StoreError> {
    const storeSubmission = new StateSubmissionStoreType()
    storeSubmission.id = stateSubmission.id
    storeSubmission.createdAt = stateSubmission.createdAt
    storeSubmission.updatedAt = new Date()
    storeSubmission.stateCode = stateSubmission.stateCode
    storeSubmission.stateNumber = stateSubmission.stateNumber
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

    storeSubmission.contractType = stateSubmission.contractType
    storeSubmission.contractDateStart = stateSubmission.contractDateStart
    storeSubmission.contractDateEnd = stateSubmission.contractDateEnd
    storeSubmission.managedCareEntities = stateSubmission.managedCareEntities
    storeSubmission.federalAuthorities = stateSubmission.federalAuthorities

    // State submission only field
    storeSubmission.submittedAt = stateSubmission.submittedAt

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
