import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    StateSubmissionStoreType,
    isDynamoError,
    isMapperError,
} from './dynamoTypes'

import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'

export async function findStateSubmission(
    mapper: DataMapper,
    id: string
): Promise<StateSubmissionType | undefined | StoreError> {
    try {
        const getResult = await mapper.get(
            Object.assign(new StateSubmissionStoreType(), {
                id,
            })
        )

        // if the result in the DB is a DRAFT, return an error
        if (getResult.status !== 'SUBMITTED') {
            return {
                code: 'WRONG_STATUS',
                message: 'The requested submission is not a StateSubmission',
            }
        }

        return getResult
    } catch (err) {
        if (isMapperError(err)) {
            if (err.name === 'ItemNotFoundException') {
                return undefined
            }
        }

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
