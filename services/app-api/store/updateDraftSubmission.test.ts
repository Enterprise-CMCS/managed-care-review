import { DraftSubmissionStoreType } from './dynamoTypes'
import { getTestStore, getTestDynamoMapper } from '../testHelpers/storeHelpers'

import { isStoreError } from './storeError'

describe('updateDraftSubmission', () => {
    it('creates a new submission and update to add a document', async () => {
        // get a connection to the db
        const store = getTestStore()
        const mapper = getTestDynamoMapper()

        // create new submission
        const inputParams = {
            stateCode: 'FL',
            programID: 'MCAC',
            submissionDescription: 'a new great submission',
            submissionType: 'CONTRACT_ONLY' as const,
            documents: []
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                inputParams
            )

            if (isStoreError(draftSubResult)) {
                throw new Error(
                    'Got an error in insert test' + draftSubResult.message
                )
            }
            const draftSubmission = draftSubResult
            const createdID = draftSubmission.id

            expect(draftSubmission.documents.length).toEqual(0)

            // update submission by adding a document
            const updateSubResult = await store.updateDraftSubmission(
                {
                    ...draftSubmission,
                    documents: [
                        {
                        name: 'testdoc.pdf',
                        url: 'https://www.example.com'
                    }
                    ]
                }
            )
        
            if (isStoreError(updateSubResult)) {
                throw new Error(
                    'Got an error in insert test' + updateSubResult.message
                )
            }
        
            try {
                const getResult = await mapper.get(
                    Object.assign(new DraftSubmissionStoreType(), {
                        id: createdID,
                    })
                )

                expect(getResult.id).not.toEqual('foo')
                expect(getResult.documents.length).toEqual(1)
                expect(getResult.documents[0]).toEqual(expect.objectContaining(
                    {
                        name: 'testdoc.pdf',
                        url: 'https://www.example.com'
                    }
                ))
               
                 
            } catch (dynamoErr) {
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            throw new Error(createErr)
        }

    
    })
    
})
