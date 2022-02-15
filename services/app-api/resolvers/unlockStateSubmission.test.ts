import UNLOCK_STATE_SUBMISSION from '../../app-graphql/src/mutations/unlockStateSubmission.graphql'
import {
    constructTestPostgresServer,
    createTestStateSubmission,
    fetchTestDraftSubmissionById,
    submitTestDraftSubmission,
    unlockTestDraftSubmission,
    updateTestDraftSubmission
} from '../testHelpers/gqlHelpers'


describe('unlockStateSubmission', () => {
    it('returns a DraftSubmission', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission = await createTestStateSubmission(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // Unlock
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const unlockResult = await cmsServer.executeOperation({
            query: UNLOCK_STATE_SUBMISSION,
            variables: {
                input: {
                    submissionID: stateSubmission.id,
                },
            },
        })

        expect(unlockResult.errors).toBeUndefined()
        const unlockedSub =
            unlockResult?.data?.unlockStateSubmission.draftSubmission
        
        // After unlock, we should get a draft submission back
        expect(unlockedSub.__typename).toEqual('DraftSubmission')

        // after unlock we should be able to update that draft submission and get the results
        const updates = {
            programIDs: ['cnet'],
            submissionType: 'CONTRACT_AND_RATES' as const,
            submissionDescription: 'UPDATED_AFTER_UNLOCK',
            documents: [],
            contractType: 'BASE' as const,
            contractDocuments: [],
            managedCareEntities: ['MCO'],
            federalAuthorities: ['VOLUNTARY' as const],
            rateDocuments: [],
            stateContacts: [],
            actuaryContacts: [],
        }

        await updateTestDraftSubmission(stateServer, stateSubmission.id, updates)

        const refetched = await fetchTestDraftSubmissionById(stateServer, stateSubmission.id)

        expect(refetched.submissionDescription).toEqual('UPDATED_AFTER_UNLOCK')

    })

    it('can be unlocked repeatedly', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission = await createTestStateSubmission(stateServer)

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id)

        await submitTestDraftSubmission(stateServer, stateSubmission.id)

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id)

        await submitTestDraftSubmission(stateServer, stateSubmission.id)

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id)

    })

})
