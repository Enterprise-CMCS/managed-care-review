import { SubmissionStoreType } from './dynamoTypes'
import { getTestStore, getTestDynamoMapper } from '../testHelpers/storeHelpers'
import { storeWithDynamoConfig } from './store'

import { isStoreError } from './storeError'

describe('insertDraftSubmission', () => {
    it('creates a new submission from scratch', async () => {
        // get a connection to the db
        const store = getTestStore()

        const mapper = getTestDynamoMapper()

        const inputParams = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                inputParams
            )

            // This nicely narrows our result
            if (isStoreError(draftSubResult)) {
                throw new Error(
                    'Got an error in insert test' + draftSubResult.message
                )
            }
            const draftSub = draftSubResult

            const createdID = draftSub.id
            try {
                const getResult = await mapper.get(
                    Object.assign(new SubmissionStoreType(), {
                        id: createdID,
                    })
                )

                expect(getResult.id).not.toEqual('foo')
                expect(getResult.submissionType).toEqual('CONTRACT_ONLY')
                expect(getResult.submissionDescription).toEqual(
                    'a new great submission'
                )
                expect(getResult.stateCode).toEqual('FL')
                expect(getResult.programID).toEqual('smmc')
                expect(getResult.documents).toEqual([])
                expect(getResult.contractType).toEqual(undefined)
                expect(getResult.contractDateStart).toEqual(undefined)
                expect(getResult.contractDateEnd).toEqual(undefined)
                expect(getResult.managedCareEntities).toEqual([])
                expect(getResult.federalAuthorities).toEqual([])

                expect(Date.now() - getResult.createdAt.valueOf()).toBeLessThan(
                    2000
                )
            } catch (dynamoErr) {
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            throw new Error(createErr)
        }
    })

    it('can fetch using stateNumber', async () => {
        // get a connection to the db

        const store = getTestStore()
        // const tableName = 'local-draft-submissions'

        const mapper = getTestDynamoMapper()

        const inputParams = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionDescription: 'another new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                inputParams
            )

            // This nicely narrows our result
            if (isStoreError(draftSubResult)) {
                throw new Error(
                    'Got an error in insert test' + draftSubResult.message
                )
            }
            const draftSub = draftSubResult

            const createdStateNumber = draftSub.stateNumber

            try {
                const subsOfID = []
                for await (const foo of mapper.query(
                    SubmissionStoreType,
                    {
                        stateCode: 'FL',
                        stateNumber: createdStateNumber,
                    },
                    { indexName: 'StateStateNumberAllIndex' }
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

    it('makes an increasing state ID', async () => {
        // get a connection to the db

        const store = getTestStore()
        // const tableName = 'local-draft-submissions'

        const mapper = getTestDynamoMapper()

        const inputParams = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        const inputINParams = {
            stateCode: 'IN',
            programID: 'INVC',
            submissionDescription: 'a new submission is great',
            submissionType: 'CONTRACT_AND_RATES' as const,
        }

        try {
            const draftSubOneResult = await store.insertDraftSubmission(
                inputParams
            )
            const draftSubINOneResult = await store.insertDraftSubmission(
                inputINParams
            )
            const draftSubINTwoResult = await store.insertDraftSubmission(
                inputINParams
            )
            const draftSubTwoResult = await store.insertDraftSubmission(
                inputParams
            )

            // This nicely narrows our result
            if (
                isStoreError(draftSubOneResult) ||
                isStoreError(draftSubINOneResult) ||
                isStoreError(draftSubINTwoResult) ||
                isStoreError(draftSubTwoResult)
            ) {
                throw new Error('Got an error inserting')
            }
            const draftSubOne = draftSubOneResult
            const draftSubTwo = draftSubTwoResult
            const draftSubINOne = draftSubINOneResult
            const draftSubINTwo = draftSubINTwoResult

            // by awaiting, these should _never_ collide

            const idOne = draftSubOne.id
            const idTwo = draftSubTwo.id

            const idINOne = draftSubINOne.id
            const idINTwo = draftSubINTwo.id

            try {
                const one = await mapper.get(
                    Object.assign(new SubmissionStoreType(), {
                        id: idOne,
                    })
                )
                const two = await mapper.get(
                    Object.assign(new SubmissionStoreType(), {
                        id: idTwo,
                    })
                )

                const oneIN = await mapper.get(
                    Object.assign(new SubmissionStoreType(), {
                        id: idINOne,
                    })
                )

                const twoIN = await mapper.get(
                    Object.assign(new SubmissionStoreType(), {
                        id: idINTwo,
                    })
                )

                expect(one.id).not.toEqual(two.id)
                expect(two.stateNumber).toBeGreaterThan(one.stateNumber)
                expect(twoIN.stateNumber).toBeGreaterThan(oneIN.stateNumber)
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

        const store = getTestStore()

        const inputParams = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        try {
            const draftSubOnePromise = store.insertDraftSubmission(inputParams)
            const draftSubTwoPromise = store.insertDraftSubmission(inputParams)
            const draftSubThreePromise =
                store.insertDraftSubmission(inputParams)
            const draftSubFourPromise = store.insertDraftSubmission(inputParams)
            const draftSubFivePromise = store.insertDraftSubmission(inputParams)
            const draftSubSixPromise = store.insertDraftSubmission(inputParams)

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
            sixValues.forEach((result) => {
                // This nicely narrows our result
                if (isStoreError(result)) {
                    throw new Error(
                        'Got an error in insert test' + result.message
                    )
                }
                const draftSub = result

                expect(seenStateNumbers.has(draftSub.stateCode)).toBeFalsy()
                seenStateNumbers.add(draftSub.stateCode)
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

    it('returns an error for connection errors', async () => {
        const config = {
            region: 'localhost',
            endpoint: 'http://localhost:8973',
            accessKeyId: 'LOCAL_FAKE_KEY',
            secretAccessKey: 'LOCAL_FAKE_SECRET',

            maxRetries: 1,
        }

        const store = storeWithDynamoConfig(config, 'local-')

        const inputParams = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        try {
            const insertResult = await store.insertDraftSubmission(inputParams)

            if (!isStoreError(insertResult)) {
                throw new Error('We Should not have been able to connect')
            }
            const err = insertResult
            expect(err.code).toBe('CONNECTION_ERROR')
        } catch (createErr) {
            console.log(
                'Thrown error testing connection, we should have gotten an error:',
                createErr
            )
            throw new Error(createErr)
        }
    })
})
