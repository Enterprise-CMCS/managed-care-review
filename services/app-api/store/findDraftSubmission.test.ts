import { isStoreError } from './storeError'
import { getTestStore } from '../testHelpers/storeHelpers'
import { storeWithDynamoConfig } from './store'

describe('findDraftSubmission', () => {
    it('returns undefined if nothing is found with that ID', async () => {
        const store = getTestStore()

        const findResult = await store.findDraftSubmission(
            '4ef98660-34d6-4656-966b-db59f3003cea'
        )

        expect(findResult).toBe(undefined)
    })

    it('returns a submission if it exists', async () => {
        const store = getTestStore()

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        const draftSubResult = await store.insertDraftSubmission(inputParams)
        if (isStoreError(draftSubResult)) {
            throw new Error('Got an error setting up test')
        }

        const createdID = draftSubResult.id

        // See if we can get it back

        const result = await store.findDraftSubmission(createdID)

        if (isStoreError(result)) {
            throw new Error('Got an error finding')
        }

        expect(result).toBeDefined()
        // this lets us type narrow, but should have been covered by toBeDefined, honestly.
        if (result === undefined) {
            throw new Error('got nothing back')
        }

        expect(result.stateCode).toBe('FL')
        expect(result.programID).toBe('MCAC')
        expect(result.id).toBe(createdID)
        expect(result.submissionType).toBe('CONTRACT_ONLY')
        expect(result.submissionDescription).toBe('a new great submission')
    })
    it('returns an error if the connection is bad', async () => {
        const config = {
            region: 'localhost',
            endpoint: 'http://localhost:8973',
            accessKeyId: 'LOCAL_FAKE_KEY',
            secretAccessKey: 'LOCAL_FAKE_SECRET',

            maxRetries: 1,
        }

        const store = storeWithDynamoConfig(config)

        const findResult = await store.findDraftSubmission(
            '4ef98660-34d6-4656-966b-db59f3003cea'
        )

        if (!isStoreError(findResult)) {
            throw new Error('We Should not have been able to connect')
        }
        const err = findResult
        expect(err.code).toBe('CONNECTION_ERROR')
    })
})

describe('findDraftSubmissionByStateNumber', () => {
    it('returns undefined if nothing is found with that ID', async () => {
        const store = getTestStore()

        const findResult = await store.findDraftSubmissionByStateNumber(
            'CA',
            87364
        )

        expect(findResult).toBe(undefined)
    })

    it('returns a submission if it exists', async () => {
        const store = getTestStore()

        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
        }

        const draftSubResult = await store.insertDraftSubmission(inputParams)
        if (isStoreError(draftSubResult)) {
            throw new Error('Got an error setting up test')
        }

        const createdStateNumber = draftSubResult.stateNumber

        // See if we can get it back

        const result = await store.findDraftSubmissionByStateNumber(
            'FL',
            createdStateNumber
        )

        if (isStoreError(result)) {
            throw new Error('Got an error finding')
        }

        expect(result).toBeDefined()
        // this lets us type narrow, but should have been covered by toBeDefined, honestly.
        if (result === undefined) {
            throw new Error('got nothing back')
        }

        expect(result.stateCode).toBe('FL')
        expect(result.stateNumber).toBe(createdStateNumber)
        expect(result.submissionType).toBe('CONTRACT_ONLY')
        expect(result.submissionDescription).toBe('a new great submission')
        expect(result.programID).toBe('MCAC')
    })
    it('returns an error if the connection is bad', async () => {
        const config = {
            region: 'localhost',
            endpoint: 'http://localhost:8973',
            accessKeyId: 'LOCAL_FAKE_KEY',
            secretAccessKey: 'LOCAL_FAKE_SECRET',

            maxRetries: 1,
        }

        const store = storeWithDynamoConfig(config)

        const findResult = await store.findDraftSubmissionByStateNumber(
            'MI',
            2323
        )

        if (!isStoreError(findResult)) {
            throw new Error('We Should not have been able to connect')
        }
        const err = findResult
        expect(err.code).toBe('CONNECTION_ERROR')
    })
})
