import { newLocalStoreConnection } from './store'
import { DataMapper } from '@aws/dynamodb-data-mapper'

import { DraftSubmissionStoreType } from './draftSubmissionStoreType'

import { insertDraftSubmission } from './createDraftSubmission'

describe('insertDraftSubmission', () => {
    it('creates a new submission from scratch', async () => {
        // get a connection to the db

        const conn = newLocalStoreConnection('http://localhost:8000')
        // const tableName = 'local-draft-submissions'

        const mapper = new DataMapper({ client: conn })

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            description: 'a new great submission',
            ratesType: 'CONTRACTS_ONLY' as const,
        }

        try {
            const draftSub = await insertDraftSubmission(conn, inputParams)
            console.log('draftQ!!', draftSub)

            const createdID = draftSub.id

            try {
                const getResult = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: createdID,
                    })
                )
                console.log('GOT', getResult)

                expect(getResult.id).not.toEqual('foo')
                expect(getResult.description).toEqual('a new great submission')
                expect(getResult.stateCode).toEqual('FL')

                expect(Date.now() - getResult.createdAt.valueOf()).toBeLessThan(
                    2000
                )
            } catch (dynamoErr) {
                console.log(dynamoErr)
                fail(dynamoErr)
                return
            }
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            fail(createErr)
            return
        }

        ///what
        // console.log('YES')
        // const toSave = Object.assign(new DraftSubmission(), inputParams)
        // try {
        //     const putResult = await mapper.put(toSave)

        //     console.log('PUTTT', putResult)
        // } catch (puErr) {
        //     console.log('NO')
        //     console.log('putere', puErr)
        //     fail(puErr)
        //     return
        // }

        // const getParams = { id: 'foo' }

        // try {
        //     const listResult = await mapper.get(
        //         Object.assign(new DraftSubmissionStoreType(), getParams)
        //     )
        //     console.log(listResult)
        // } catch (dynamoErr) {
        //     console.log(dynamoErr)
        //     fail(dynamoErr)
        //     return
        // }

        // // list them?
        // const listParams = {
        //     TableName: tableName,
        // }

        // try {
        //     const listResult = await conn.scan(listParams).promise()
        //     console.log(listResult.Items)
        // } catch (dynamoErr) {
        //     console.log(dynamoErr)
        //     fail(dynamoErr)
        //     return
        // }

        // try {
        //     for await (const item of mapper.scan(DraftSubmissionStoreType)) {
        //         console.log('go', item)
        //         // individual items will be yielded as the scan is performed
        //     }
        // } catch (scanErr) {
        //     fail(scanErr)
        // }

        // check that there is nothing in it

        // insert something
        // fail()
    })

    // it('fails like a handler', async () => {
    //     // get a connection to the db
    //     const conn = newLocalStoreConnection('http://localhost:8000')
    //     const tableName = 'local-draft-submissions'

    //     const inputParams = {
    //         stateCode: 'FL',
    //         programID: 'MCAC',
    //         description: 'a new good submission',
    //         type: 'CONTRACT_ONLY',
    //     }

    //     // store
    //     // conn.insertDraftSubmission( params ): DraftSubmission | StoreError

    //     // transform inputParams into a StoreDraftSubmission type
    //     // use mapper to get in there.

    //     // conn.updateDraftSubmission(draft: DraftSubmission): DraftSubmission | Error

    //     const insertParams = {
    //         TableName: tableName,
    //         Item: {
    //             id: 'foo',
    //             programID: 'OSWA',
    //             stateCode: 'FL',
    //             description: 'a good submission',
    //         },
    //     }

    //     try {
    //         const insertResult = await conn.put(insertParams).promise()
    //         console.log('inserted', insertResult)
    //     } catch (insertErr) {
    //         console.log(insertErr)
    //         fail(insertErr)
    //         return
    //     }

    //     const getParams = {
    //         TableName: tableName,
    //         Key: { id: 'foo' },
    //     }

    //     try {
    //         const listResult = await conn.get(getParams).promise()
    //         console.log(listResult.Item)
    //     } catch (dynamoErr) {
    //         console.log(dynamoErr)
    //         fail(dynamoErr)
    //         return
    //     }

    //     // list them?
    //     const listParams = {
    //         TableName: tableName,
    //     }

    //     try {
    //         const listResult = await conn.scan(listParams).promise()
    //         console.log(listResult.Items)
    //     } catch (dynamoErr) {
    //         console.log(dynamoErr)
    //         fail(dynamoErr)
    //         return
    //     }

    //     // check that there is nothing in it

    //     // insert something
    //     fail()
    // })

    it('can fetch using stateNumber', async () => {
        // get a connection to the db

        const conn = newLocalStoreConnection('http://localhost:8000')
        // const tableName = 'local-draft-submissions'

        const mapper = new DataMapper({ client: conn })

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            description: 'a new great submission',
            ratesType: 'CONTRACTS_ONLY' as const,
        }

        try {
            const draftSub = await insertDraftSubmission(conn, inputParams)
            console.log('draftQ!!', draftSub)

            const createdStateNumber = draftSub.stateNumber
            console.log('STAWTGE VODE', createdStateNumber)

            try {
                const subsOfID = []
                for await (const foo of mapper.query(
                    DraftSubmissionStoreType,
                    {
                        stateCode: 'FL',
                        stateNumber: createdStateNumber,
                    },
                    { indexName: 'StateStateNumberIndex' }
                )) {
                    console.log('GOT IT YEA', foo)
                    subsOfID.push(foo)
                    // individual items with a hash key of "foo" will be yielded as the query is performed
                }

                expect(subsOfID).toHaveLength(1)
            } catch (dynamoErr) {
                console.log(dynamoErr)
                fail(dynamoErr)
                return
            }
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            fail(createErr)
            return
        }
    })

    it('makes a consecutive state ID', async () => {
        // get a connection to the db

        const conn = newLocalStoreConnection('http://localhost:8000')
        // const tableName = 'local-draft-submissions'

        const mapper = new DataMapper({ client: conn })

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            description: 'a new great submission',
            ratesType: 'CONTRACTS_ONLY' as const,
        }

        const inputINParams = {
            stateCode: 'IN',
            programID: 'INVC',
            description: 'a new submission is great',
            ratesType: 'CONTRACTS_AND_RATES' as const,
        }

        try {
            const draftSubOne = await insertDraftSubmission(conn, inputParams)
            const draftSubINOne = await insertDraftSubmission(
                conn,
                inputINParams
            )
            const draftSubTwo = await insertDraftSubmission(conn, inputParams)
            const draftSubINTwo = await insertDraftSubmission(
                conn,
                inputINParams
            )

            // by awaiting, these should _never_ collide

            const idOne = draftSubOne.id
            const idTwo = draftSubTwo.id

            const idINOne = draftSubINOne.id
            const idINTwo = draftSubINTwo.id

            try {
                const one = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: idOne,
                    })
                )
                const two = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: idTwo,
                    })
                )

                const oneIN = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: idINOne,
                    })
                )

                const twoIN = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: idINTwo,
                    })
                )

                expect(one.id).not.toEqual(two.id)
                expect(two.stateNumber).toEqual(one.stateNumber + 1)
                expect(twoIN.stateNumber).toEqual(oneIN.stateNumber + 1)
            } catch (dynamoErr) {
                console.log(dynamoErr)
                fail(dynamoErr)
                return
            }
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            fail(createErr)
            return
        }
    })

    it('is robust gainst concurrent creations', async () => {
        // get a connection to the db

        const conn = newLocalStoreConnection('http://localhost:8000')
        // const tableName = 'local-draft-submissions'

        const mapper = new DataMapper({ client: conn })

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            description: 'a new great submission',
            ratesType: 'CONTRACTS_ONLY' as const,
        }

        try {
            const draftSubOnePromise = insertDraftSubmission(conn, inputParams)
            const draftSubTwoPromise = insertDraftSubmission(conn, inputParams)
            const draftSubThreePromise = insertDraftSubmission(
                conn,
                inputParams
            )
            const draftSubFourPromise = insertDraftSubmission(conn, inputParams)
            const draftSubFivePromise = insertDraftSubmission(conn, inputParams)
            const draftSubSixPromise = insertDraftSubmission(conn, inputParams)

            const sixValues = await Promise.all([
                draftSubOnePromise,
                draftSubTwoPromise,
                draftSubThreePromise,
                draftSubFourPromise,
                draftSubFivePromise,
                draftSubSixPromise,
            ])

            console.log('ALL SIX VALUES', sixValues)

            const seenStateNumbers = new Set<string>()
            sixValues.forEach((pValue) => {
                if (pValue.stateCode) {
                    if (seenStateNumbers.has(pValue.stateCode)) {
                        fail(
                            new Error(
                                'multiple submissions got the same state code'
                            )
                        )
                        return
                    }
                    seenStateNumbers.add(pValue.stateCode)
                }
            })

            if (seenStateNumbers.size == 0) {
                fail(new Error('Not a single submission got a state code'))
            }

            // none of these six values should be the same
            // they can be error, but they can't be the same.
            // we should return an error if we can't insert. BAD_TIMING

            fail()
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            fail(createErr)
            return
        }
    })
})

// tests
// what if we isert somthin that is already inserted? -- doesn't quite make sense. -- new ID for everyhing, but differen stateNumber
// what how do we get the next number?
// what we put in we get out
// we can update something that's there
// create two in a row, make sure they always get different IDs
// create three, state1, state2, state1, ensure that we get 1,1,2 state_number
