import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    SubmissionStoreType,
    isDynamoError,
    isMapperError,
    convertToDomainSubmission,
} from './dynamoTypes'

import {
    isStateSubmission,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'

export async function findStateSubmission(
    mapper: DataMapper,
    id: string
): Promise<StateSubmissionType | undefined | StoreError> {
    try {
        const getResult = await mapper.get(
            Object.assign(new SubmissionStoreType(), {
                id,
            })
        )

        const domainResult = convertToDomainSubmission(getResult)

        // if the result in the DB is a DRAFT, return an error
        if (!isStateSubmission(domainResult)) {
            return {
                code: 'WRONG_STATUS',
                message: 'The requested submission is not a StateSubmission',
            }
        }

        return domainResult
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
