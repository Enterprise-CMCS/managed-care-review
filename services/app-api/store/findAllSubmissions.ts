import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    DraftSubmissionStoreType,
    StateSubmissionStoreType,
    isDynamoError,
} from './dynamoTypes'

import {
    DraftSubmissionType,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'

export async function findAllSubmissions(
    mapper: DataMapper,
    stateCode: string
): Promise<(DraftSubmissionType | StateSubmissionType)[] | StoreError> {
    try {
        const submissions: (DraftSubmissionType | StateSubmissionType)[] = []

        for await (const draftSubmission of mapper.query(
            DraftSubmissionStoreType,
            {
                stateCode: stateCode,
            },
            {
                indexName: 'StateStateNumberAllIndex',
            }
        )) {
            console.log(
                'FOUND draftSubmission',
                draftSubmission.status,
                draftSubmission.submittedAt
            )
            submissions.push(draftSubmission)
        }

        return submissions
    } catch (err) {
        if (isDynamoError(err)) {
            if (
                err.code === 'UnknownEndpoint' ||
                err.code === 'NetworkingError'
            ) {
                return {
                    code: 'CONNECTION_ERROR',
                    message:
                        'Failed to connect to the database when trying to generate the new State Submission Number',
                }
            }
        }

        console.log('very unexpected error fetching', err.name)
        throw err
    }
}
