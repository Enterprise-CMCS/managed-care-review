import { GraphQLError } from 'graphql'
import UNLOCK_STATE_SUBMISSION from '../../app-graphql/src/mutations/unlockStateSubmission.graphql'
import { Submission2 } from '../gen/gqlServer'
import { todaysDate } from '../testHelpers/dateHelpers'
import {
    constructTestPostgresServer, createAndUpdateTestDraftSubmission,
    createTestStateSubmission,
    fetchTestDraftSubmissionById,
    submitTestDraftSubmission,
    unlockTestDraftSubmission,
    updateTestDraftSubmission
} from '../testHelpers/gqlHelpers'
import { mockStoreThatErrors } from '../testHelpers/storeHelpers'


describe('unlockStateSubmission', () => {

    it('returns a Submission2 with all revisions', async () => {
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

        if (!unlockResult?.data) {
            throw new Error('this should never happen')
        }

        const unlockedSub: Submission2 =
            unlockResult.data.unlockStateSubmission.submission
        
        // After unlock, we should get a draft submission back
        expect(unlockedSub.status).toEqual('UNLOCKED')

        expect(unlockedSub.revisions.length).toEqual(2)

        expect(unlockedSub.revisions[0].revision.submitInfo).toBeNull()
        expect(unlockedSub.revisions[1].revision.submitInfo).toBeDefined()
        expect(unlockedSub.revisions[1].revision.submitInfo?.updatedAt).toEqual(todaysDate())

    })

    it('returns a DraftSubmission that can be updated without errors', async () => {
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
            unlockResult?.data?.unlockStateSubmission.submission
        
        // After unlock, we should get a draft submission back
        expect(unlockedSub.status).toEqual('UNLOCKED')

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

        const draft = await unlockTestDraftSubmission(cmsServer, stateSubmission.id)
        expect(draft.status).toEqual('UNLOCKED')

    })

    it('returns errors if a state user tries to unlock', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission = await createTestStateSubmission(stateServer)

        // Unlock
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const unlockResult = await stateServer.executeOperation({
            query: UNLOCK_STATE_SUBMISSION,
            variables: {
                input: {
                    submissionID: stateSubmission.id,
                },
            },
        })

        expect(unlockResult.errors).toBeDefined()
        const err = (unlockResult.errors as GraphQLError[])[0]

        expect(err.extensions['code']).toEqual('FORBIDDEN')
        expect(err.message).toEqual('user not authorized to unlock submission')

    })

    it('returns errors if unlocked from the wrong state', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // First, create a new draft submission
        const stateSubmission = await createAndUpdateTestDraftSubmission(stateServer)

        // Attempt Unlock Draft
        const unlockDraftResult = await cmsServer.executeOperation({
            query: UNLOCK_STATE_SUBMISSION,
            variables: {
                input: {
                    submissionID: stateSubmission.id,
                },
            },
        })

        expect(unlockDraftResult.errors).toBeDefined()
        const err = (unlockDraftResult.errors as GraphQLError[])[0]

        expect(err.extensions['code']).toEqual('BAD_USER_INPUT')
        expect(err.message).toEqual('Attempted to unlock submission with wrong status')

        await submitTestDraftSubmission(stateServer, stateSubmission.id)

        // Unlock Submission
        await unlockTestDraftSubmission(cmsServer, stateSubmission.id)

        // Attempt Unlock Unlocked
        const unlockUnlockedResult = await cmsServer.executeOperation({
            query: UNLOCK_STATE_SUBMISSION,
            variables: {
                input: {
                    submissionID: stateSubmission.id,
                },
            },
        })

        expect(unlockUnlockedResult.errors).toBeDefined()
        const unlockErr = (unlockUnlockedResult.errors as GraphQLError[])[0]

        expect(unlockErr.extensions['code']).toEqual('BAD_USER_INPUT')
        expect(unlockErr.message).toEqual('Attempted to unlock submission with wrong status')


    })

    it('returns an error if the submission does not exit', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // First, create a new submitted submission
        // const stateSubmission = await createTestStateSubmission(stateServer)

        // Unlock
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const unlockResult = await cmsServer.executeOperation({
            query: UNLOCK_STATE_SUBMISSION,
            variables: {
                input: {
                    submissionID: 'foo-bar',
                },
            },
        })

        expect(unlockResult.errors).toBeDefined()
        const err = (unlockResult.errors as GraphQLError[])[0]

        expect(err.extensions['code']).toEqual('BAD_USER_INPUT')
        expect(err.message).toEqual('A submission must exist to be unlocked: foo-bar')
    })

    it('returns an error if the DB errors', async () => {

        const errorStore = mockStoreThatErrors()

        const cmsServer = await constructTestPostgresServer({
            store: errorStore,
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
                    submissionID: 'foo-bar',
                },
            },
        })

        expect(unlockResult.errors).toBeDefined()
        const err = (unlockResult.errors as GraphQLError[])[0]

        expect(err.extensions['code']).toEqual('INTERNAL_SERVER_ERROR')
        expect(err.message).toEqual('Issue finding a state submission of type UNEXPECTED_EXCEPTION. Message: this error came from the generic store with errors mock')
        
    })

})
