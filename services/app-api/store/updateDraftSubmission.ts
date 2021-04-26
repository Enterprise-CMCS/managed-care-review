import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import { DocumentStoreT, DraftSubmissionStoreType, isDynamoError } from './dynamoTypes'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

export async function updateDraftSubmission(
    mapper: DataMapper,
    draftSubmission: DraftSubmissionType
): Promise<DraftSubmissionType | StoreError> {
    const storeDraft = new DraftSubmissionStoreType()
    
    storeDraft.id = draftSubmission.id
    storeDraft.createdAt = draftSubmission.createdAt
    storeDraft.updatedAt = new Date()

    // these args carry over but aren't set explicitly
    storeDraft.stateCode = draftSubmission.stateCode
    storeDraft.stateNumber = draftSubmission.stateNumber

    // SOME args can be set, others must be kept
    storeDraft.submissionType = draftSubmission.submissionType
    storeDraft.programID = draftSubmission.programID
    storeDraft.submissionDescription = draftSubmission.submissionDescription
    
    draftSubmission.documents.forEach ((doc) => {
        const storeDocument = new DocumentStoreT()
        storeDocument.name = doc.name
        storeDocument.url = doc.url
        storeDocument.s3URL = doc.s3URL
        storeDraft.documents.push(storeDocument)
    })

    try {
        const putResult = await mapper.put(storeDraft)

        return putResult
    } catch (err) {
        if (isDynamoError(err)) {
            if (
                err.code === 'UnknownEndpoint' ||
                err.code === 'NetworkingError'
            ) {
                return {
                    code: 'CONNECTION_ERROR',
                    message:
                        'Failed to connect to the database when trying to insert a new Submission',
                }
            }
        }
        console.log(
            'VERY unexpected insert a new Submission, unknown error: ',
            err
        )
        throw err
    }
}
