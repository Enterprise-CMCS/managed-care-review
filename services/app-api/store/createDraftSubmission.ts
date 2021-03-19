import DynamoDB from 'aws-sdk/clients/dynamodb'
import { DataMapper } from '@aws/dynamodb-data-mapper'
import { FunctionExpression, AttributePath } from '@aws/dynamodb-expressions'
import { v4 as uuidv4 } from 'uuid'

import { DraftSubmissionStoreType } from './draftSubmissionStoreType'
import {
    DraftSubmissionType,
    SubmissionRatesType,
} from '../../app-web/src/common-code/domain-models'

type InsertDraftSubmissionArgsType = {
    stateCode: string
    programID: string
    ratesType: SubmissionRatesType
    description: string
}

export async function insertDraftSubmission(
    conn: DynamoDB,
    args: InsertDraftSubmissionArgsType
): Promise<DraftSubmissionType> {
    // in order to create a new draft submission, we have to do a few things in the DB.
    // * given: state.program, contractstype, description
    //   * createdAt -- now
    //   * state-num -- this is a transaction. find biggest state-num, add one
    //   * name (state_program_num) -- db? / synthesized
    //   * id -- db/resolver? -- generate a new UUID

    const draft = new DraftSubmissionStoreType() // you might like that this took input vars, but that seems opposed to how this library works wrt to searching
    draft.id = uuidv4()
    draft.createdAt = new Date()

    // in order to support incrementing IDs for each state's submissions, we need to generate
    // a new stateNumber that is one more than all previously created statNumbers
    // this enables us to generate state names like VA_MORC_0002 where the 0002 is unique for
    // the whole state.

    // we have a secondary index that is state / stateNumber
    // find the next number
    // do a conditional insert, if that number is already taken, return an errror.

    const mapper = new DataMapper({ client: conn })
    // get all submissions for a given state in order, see the last one, add one.
    const biggestStateNumber = []
    for await (const foo of mapper.query(
        DraftSubmissionStoreType,
        {
            stateCode: 'FL',
        },
        {
            indexName: 'StateStateNumberIndex',
            limit: 1,
            scanIndexForward: false,
        }
    )) {
        biggestStateNumber.push(foo)
        // individual items with a hash key of "foo" will be yielded as the query is performed
    }

    if (biggestStateNumber.length == 0) {
        draft.stateNumber = 1
    } else {
        draft.stateNumber = biggestStateNumber[0].stateNumber + 1
    }

    // what do we do with these args?
    // return a DraftSubmissinoType
    try {
        const toSave = Object.assign(draft, args)
        const uniqueCondition = new FunctionExpression(
            'attribute_not_exists',
            new AttributePath('stateNumber')
        )

        const putResult = await mapper.put(toSave, {
            condition: uniqueCondition,
        })

        return putResult
    } catch (err) {
        console.log('Put Error', err)
        throw err
    }
}
