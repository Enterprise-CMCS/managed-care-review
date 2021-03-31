import DynamoDB from 'aws-sdk/clients/dynamodb'
import { DataMapper } from '@aws/dynamodb-data-mapper'
import { v4 as uuidv4 } from 'uuid'

import { DraftSubmissionStoreType } from './draftSubmissionStoreType'
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

type DynamoError = {
    code: string
}

function isDynamoError(err: unknown): err is DynamoError {
    if (err && typeof err == 'object' && 'code' in err) {
        return true
    }
    return false
}

const StoreErrorCodes = ['CONNECTION_ERROR', 'INSERT_ERROR'] as const
type StoreErrorCode = typeof StoreErrorCodes[number] // iterable union type

export type StoreError = {
    code: StoreErrorCode
    message: string
}

// Wow this seems complicated. If there are cleaner ways to do this I'd like to know it.
export function isStoreError(err: unknown): err is StoreError {
    if (err && typeof err == 'object') {
        if ('code' in err && 'message' in err) {
            // This seems ugly but neccessary in a type guard.
            const hasCode = err as { code: unknown }
            if (typeof hasCode.code === 'string') {
                if (
                    StoreErrorCodes.some((errCode) => hasCode.code === errCode)
                ) {
                    return true
                }
            }
        }
    }
    return false
}

// getNextStateNumber returns the next "number" for a submission for a given state. See comments below for more.
async function getNextStateNumber(
    conn: DynamoDB,
    stateCode: string
): Promise<number | StoreError> {
    // in order to support incrementing IDs for each state's submissions, we need to generate
    // a new stateNumber that is one more than all previously created statNumbers
    // this enables us to generate state names like VA_MORC_0002 where the 0002 is unique for
    // the whole state.

    // we have a secondary index that is state / stateNumber
    // find the next number
    try {
        const mapper = new DataMapper({ client: conn })
        // get all submissions for a given state in order, see the last one, add one.
        const biggestStateNumber = []
        console.log('awaiting new number')
        for await (const draft of mapper.query(
            DraftSubmissionStoreType,
            {
                stateCode: stateCode,
            },
            {
                indexName: 'StateStateNumberIndex',
                limit: 1,
                scanIndexForward: false,
            }
        )) {
            console.log('back with a result', draft)
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
    conn: DynamoDB,
    args: InsertDraftSubmissionArgsType
): Promise<DraftSubmissionType | StoreError> {
    // in order to create a new draft submission, we have to do a few things in the DB.
    // * given: state.program, contractstype, description
    //   * createdAt -- now
    //   * state-num -- this is a transaction. find biggest state-num, add one
    //   * name (state_program_num) -- db? / synthesized
    //   * id -- db/resolver? -- generate a new UUID

    const draft = new DraftSubmissionStoreType() // you might like that this took input vars, but that seems opposed to how this library works wrt to searching
    draft.id = uuidv4()
    draft.createdAt = new Date()

    draft.submissionType = args.submissionType
    draft.programID = args.programID
    draft.submissionDescription = args.submissionDescription
    draft.stateCode = args.stateCode

    // TMP try and make a basic query
    try {
        const docker = new DynamoDB.DocumentClient()

        const params = {
            TableName: 'wml-fix-502-draft-submissions',
            Key: {
                id: 'foo-bar',
            },
        }

        console.log('getting item')
        const result = await docker.get(params).promise()

        console.log('REQ', result)
        return { code: 'CONNECTION_ERROR', message: 'please get here.' }
    } catch (err) {
        console.log('error in basic', err)
        throw err
    }

    // try {
    //     const stateNumberResult = await getNextStateNumber(conn, args.stateCode)
    //     console.log('got number back', stateNumberResult)
    //     if (isStoreError(stateNumberResult)) {
    //         return stateNumberResult
    //     }

    //     draft.stateNumber = stateNumberResult
    // } catch (err) {
    //     console.log('error getting state number', err)
    //     throw err
    // }

    // const mapper = new DataMapper({ client: conn })
    // // what do we do with these args?
    // // return a DraftSubmissionType
    // try {
    //     console.log('awaitng PUT')
    //     const putResult = await mapper.put(draft)
    //     console.log('got back from put')

    //     return putResult
    // } catch (err) {
    //     console.log('put erroir', err)
    //     if (isDynamoError(err)) {
    //         if (
    //             err.code === 'UnknownEndpoint' ||
    //             err.code === 'NetworkingError'
    //         ) {
    //             return {
    //                 code: 'CONNECTION_ERROR',
    //                 message:
    //                     'Failed to connect to the database when trying to insert a new Submission',
    //             }
    //         }
    //     }
    //     console.log(
    //         'VERY unexpected insert a new Submission, unknown error: ',
    //         err
    //     )
    //     throw err
    // }
}
