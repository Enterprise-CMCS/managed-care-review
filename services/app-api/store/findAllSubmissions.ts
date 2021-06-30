import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    SubmissionStoreType,
    isDynamoError,
    isNodeError,
    convertToDomainSubmission,
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

        for await (const storeSubmission of mapper.query(
            SubmissionStoreType,
            {
                stateCode: stateCode,
            },
            {
                indexName: 'StateStateNumberAllIndex',
                scanIndexForward: false,
            }
        )) {
            const domainSubmission = convertToDomainSubmission(storeSubmission)
            // What do we do with an error here? Log it? If we have corrupted data in
            // the db there likely isn't anything we can do about it, we should log?
            // Still return all the non corrupted things?
            if (isNodeError(domainSubmission)) {
                console.log(
                    `ERROR: submission with id: ${storeSubmission.id} did not parse into a domain model`
                )
            } else {
                submissions.push(domainSubmission)
            }
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
