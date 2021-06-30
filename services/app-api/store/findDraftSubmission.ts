import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    convertToDomainSubmission,
    SubmissionStoreType,
    isDynamoError,
    isMapperError,
} from './dynamoTypes'

import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'

export async function findDraftSubmission(
    mapper: DataMapper,
    draftUUID: string
): Promise<DraftSubmissionType | undefined | StoreError> {
    try {
        const getResult = await mapper.get(
            Object.assign(new SubmissionStoreType(), {
                id: draftUUID,
            })
        )

        const domainResult = convertToDomainSubmission(getResult)

        // if the result in the DB is a DRAFT, return an error
        if (!isDraftSubmission(domainResult)) {
            return {
                code: 'WRONG_STATUS',
                message: 'The requested submission is not a DraftSubmission',
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

export async function findDraftSubmissionByStateNumber(
    mapper: DataMapper,
    stateCode: string,
    stateNumber: number
): Promise<DraftSubmissionType | undefined | StoreError> {
    try {
        const getIterator = mapper.query(
            SubmissionStoreType,
            {
                stateCode: stateCode,
                stateNumber: stateNumber,
            },
            {
                indexName: 'StateStateNumberAllIndex',
                limit: 1,
                scanIndexForward: false,
            }
        )

        // Kinda weird. I figured that the .get() semantics would support
        // other indexes, but I can't find any docs supporting that.
        // so we query, but it's impossible for us to get two back b/c this is searching
        // on the Sort and Index keys for the index, which are always unique.
        for await (const draftSubmission of getIterator) {
            // do something with `record`
            const domainResult = convertToDomainSubmission(draftSubmission)

            // if the result in the DB is not a DRAFT, return an error
            if (!isDraftSubmission(domainResult)) {
                return {
                    code: 'WRONG_STATUS',
                    message:
                        'The requested submission is not a DraftSubmission',
                }
            }

            return domainResult
        }

        // if we get here, that means there were none
        return undefined
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
