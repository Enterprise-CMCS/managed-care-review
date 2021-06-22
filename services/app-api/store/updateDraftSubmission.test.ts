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

            // update submission
            const startDate = new Date(2021, 5, 6)
            const endDate = new Date(2022, 4, 31)
            const dateCertified = new Date(2021, 3, 15)
            const updateSubResult = await store.updateDraftSubmission({
                ...draftSubmission,
                documents: [
                    {
                        name: 'testdoc.pdf',
                        s3URL: 'fakeS3URL',
                    },
                ],
                contractType: 'BASE',
                contractDateStart: startDate,
                contractDateEnd: endDate,
                managedCareEntities: ['MCO'],
                federalAuthorities: ['VOLUNTARY'],
                rateType: 'NEW',
                rateDateStart: startDate,
                rateDateEnd: endDate,
                rateDateCertified: dateCertified,
            })

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
                expect(getResult.documents[0]).toEqual(
                    expect.objectContaining({
                        name: 'testdoc.pdf',
                        s3URL: 'fakeS3URL',
                    })
                )
                expect(getResult.contractDateStart).toEqual(startDate)
                expect(getResult.contractDateEnd).toEqual(endDate)
                expect(getResult.rateDateStart).toEqual(startDate)
                expect(getResult.rateDateEnd).toEqual(endDate)
                expect(getResult.rateDateCertified).toEqual(dateCertified)
            } catch (dynamoErr) {
                throw new Error(dynamoErr)
            }
        } catch (createErr) {
            throw new Error(createErr)
        }
    })
})
