import { DataMapper } from '@aws/dynamodb-data-mapper'
import { v4 as uuidv4 } from 'uuid'

import { StoreError, isStoreError } from './storeError'
import { SubmissionStoreType, isDynamoError } from './dynamoTypes'
import {
    DraftSubmissionType,
    SubmissionType,
} from '../../app-web/src/common-code/domain-models'

export type InsertDraftSubmissionArgsType = {
    stateCode: string
    programID: string
    submissionType: SubmissionType
    submissionDescription: string
}

// getNextStateNumber returns the next "number" for a submission for a given state. See comments below for more.
async function getNextStateNumber(
    mapper: DataMapper,
    stateCode: string
): Promise<number | StoreError> {
    // in order to support incrementing IDs for each state's submissions, we need to generate
    // a new stateNumber that is one more than all previously created statNumbers
    // this enables us to generate state names like VA_MORC_0002 where the 0002 is unique for
    // the whole state.

    // we have a secondary index that is state / stateNumber
    // find the next number
    try {
        // get all submissions for a given state in order, see the last one, add one.
        const biggestStateNumber = []
        for await (const draft of mapper.query(
            SubmissionStoreType,
            {
                stateCode: stateCode,
            },
            {
                indexName: 'StateStateNumberAllIndex',
                limit: 1,
                scanIndexForward: false,
            }
        )) {
            biggestStateNumber.push(draft)
            // individual items with a hash key of "foo" will be yielded as the query is performed
        }

        if (biggestStateNumber.length == 0) {
            return 1
        } else {
            return biggestStateNumber[0].stateNumber + 1
        }
    } catch (err) {
        // figure out if this is an error we know about
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
        console.log(
            'VERY unexpected, unknown error getting state number: ',
            err
        )
        throw err
    }
}

export async function insertDraftSubmission(
    mapper: DataMapper,
    args: InsertDraftSubmissionArgsType
): Promise<DraftSubmissionType | StoreError> {
    // in order to create a new draft submission, we have to do a few things in the DB.
    // * given: state.program, contractstype, description
    //   * createdAt -- now
    //   * state-num -- this is a transaction. find biggest state-num, add one
    //   * name (state_program_num) -- db? / synthesized
    //   * id -- db/resolver? -- generate a new UUID
    //   * convert documents SubmissionDocument[] into DocumentStoreT

    const draft = new SubmissionStoreType() // you might like that this took input vars, but that seems opposed to how this library works wrt to searching
    draft.id = uuidv4()
    draft.createdAt = new Date()
    draft.updatedAt = new Date()

    draft.submissionType = args.submissionType
    draft.programID = args.programID
    draft.submissionDescription = args.submissionDescription
    draft.stateCode = args.stateCode
    draft.documents = []

    try {
        const stateNumberResult = await getNextStateNumber(
            mapper,
            args.stateCode
        )
        if (isStoreError(stateNumberResult)) {
            return stateNumberResult
        }

        draft.stateNumber = stateNumberResult
    } catch (err) {
        console.log('error getting state number', err)
        throw err
    }

    // what do we do with these args?
    // return a DraftSubmissionType
    try {
        const putResult = await mapper.put(draft)

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
