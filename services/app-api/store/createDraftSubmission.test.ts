import { newLocalStoreConnection } from './store'
import { DataMapper } from '@aws/dynamodb-data-mapper'

import { DraftSubmissionStoreType } from './draftSubmissionStoreType'

import { insertDraftSubmission } from './createDraftSubmission'

describe('insertDraftSubmission', () => {
    it('creates a new submission from scratch', async () => {
        // get a connection to the db
        console.log('starting to test')

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

            const createdID = draftSub.id

            try {
                const getResult = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: createdID,
                    })
                )

                expect(getResult.id).not.toEqual('foo')
                expect(getResult.description).toEqual('a new great submission')
                expect(getResult.stateCode).toEqual('FL')

                expect(Date.now() - getResult.createdAt.valueOf()).toBeLessThan(
                    2000
                )
            } catch (dynamoErr) {
                console.log(dynamoErr)
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            console.log('Error creating a draft submission:', createErr)
            throw new Error(createErr)
        }
    })

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

            const createdStateNumber = draftSub.stateNumber

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
                    subsOfID.push(foo)
                    // individual items with a hash key of "foo" will be yielded as the query is performed
                }

                expect(subsOfID).toHaveLength(1)
            } catch (dynamoErr) {
                console.log(dynamoErr)
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            throw new Error(createErr)
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
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            throw new Error(createErr)
        }
    })

    it.skip('is robust against concurrent creations', async () => {
        // get a connection to the db

        const conn = newLocalStoreConnection('http://localhost:8000')

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
                    expect(seenStateNumbers.has(pValue.stateCode)).toBeFalsy()
                    seenStateNumbers.add(pValue.stateCode)
                }
            })

            if (seenStateNumbers.size == 0) {
                throw new Error('Not a single submission got a state code')
            }

            // none of these six values should be the same
            // they can be error, but they can't be the same.
            // we should return an error if we can't insert. BAD_TIMING

            throw new Error()
        } catch (createErr) {
            console.log('CREAT ERR', createErr)
            throw new Error(createErr)
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
// any errors it should return?
// * Connection Error
