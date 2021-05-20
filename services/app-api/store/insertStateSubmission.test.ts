import { StateSubmissionStoreType } from './dynamoTypes'
import { getTestStore, getTestDynamoMapper } from '../testHelpers/storeHelpers'
import { storeWithDynamoConfig } from './store'

import { isStoreError } from './storeError'

describe('insertStateSubmission', () => {
    it('creates a new state submission', async () => {
        const store = getTestStore()
        const mapper = getTestDynamoMapper()

        // create new contract only draft submission
        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
            documents: [
                {
                    name: 'testdoc.pdf',
                    s3URL: 'fakeS3URL',
                },
            ],
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                inputParams
            )

            if (isStoreError(draftSubResult)) {
                throw new Error(
                    'Got an error in inserting draft submission' +
                        draftSubResult.message
                )
            }
            const draftSubmission = draftSubResult
            const submissionID = draftSubmission.id

            // create state submission from draft
            try {
                const stateSubResult = await store.insertStateSubmission({
                    submissionID,
                })

                if (isStoreError(stateSubResult)) {
                    throw new Error(
                        `Issue finding a draft submission of type ${stateSubResult.code}. Message: ${stateSubResult.message}`
                    )
                }

                if (stateSubResult === undefined) {
                    throw new Error(
                        'Returning undefined - hmm should this happen'
                    )
                }
                const stateSub = stateSubResult
                const createdID = stateSub.id
                try {
                    const getResult = await mapper.get(
                        Object.assign(new StateSubmissionStoreType(), {
                            id: createdID,
                        })
                    )

                    expect(getResult.id).not.toEqual('foo')
                    expect(getResult.submissionType).toEqual('CONTRACT_ONLY')
                    expect(getResult.submissionDescription).toEqual(
                        'a new great submission'
                    )
                    expect(getResult.stateCode).toEqual('FL')
                    expect(getResult.programID).toEqual('MCAC')
                    expect(getResult.documents.length).toEqual(1)
                    expect(getResult.documents[0]).toEqual(
                        expect.objectContaining({
                            name: 'testdoc.pdf',
                            s3URL: 'fakeS3URL',
                        })
                    )

                    expect(
                        Date.now() - getResult.updatedAt.valueOf()
                    ).toBeLessThan(2000)
                    expect(
                        Date.now() - getResult.submittedAt.valueOf()
                    ).toBeLessThan(2000)
                } catch (dynamoErr) {
                    console.log('Error fetching state submission:', dynamoErr)
                    throw new Error(dynamoErr)
                }
            } catch (createStateSubmissionErr) {
                console.log(
                    'Error creating a state submission:',
                    createStateSubmissionErr
                )
                throw new Error(createStateSubmissionErr)
            }
        } catch (createErr) {
            console.log('Error creating a draft submission:', createErr)
            throw new Error(createErr)
        }
    })

    it('returns undefined when no draft submission found at id', async () => {
        const store = getTestStore()

        const insertResult = await store.insertStateSubmission({
            submissionID: 'NOTREAL123',
        })

        expect(insertResult).toBe(undefined)
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

        try {
            const insertResult = await store.insertStateSubmission({
                submissionID: '12321asda31',
            })

            if (!isStoreError(insertResult)) {
                throw new Error('We should not have been able to connect')
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
