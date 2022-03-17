import FETCH_SUBMISSION_2 from '../../app-graphql/src/queries/fetchSubmission2.graphql'
import { base64ToDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import { todaysDate } from '../testHelpers/dateHelpers'
import {
    constructTestPostgresServer,
    createTestDraftSubmission,
    createTestStateSubmission,
    submitTestDraftSubmission,
    unlockTestDraftSubmission
} from '../testHelpers/gqlHelpers'

describe('fetchSubmission2', () => {
    it('returns draft submission payload with one revision', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        const result = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultSub = result.data?.fetchSubmission2.submission
        expect(resultSub.id).toEqual(createdID)
        expect(resultSub.revisions.length).toEqual(1)

        const revision = resultSub.revisions[0].revision

        const subData = base64ToDomain(revision.submissionData)
        if (subData instanceof Error) {
            throw subData
        } 

        expect(subData.id).toEqual(createdID)
        expect(subData.programIDs).toEqual(['cnet'])
        expect(subData.submissionDescription).toEqual('An updated submission')
        expect(subData.documents).toEqual([])
        expect(subData.contractDocuments).toEqual([
            {
                name: 'contractDocument.pdf',
                s3URL: 'fakeS3URL',
                documentCategories: ['CONTRACT'],
            },
        ])
    })

    it('returns nothing if the ID doesnt exist', async () => {
        const server = await constructTestPostgresServer()

        // then see if we can fetch that same submission
        const input = {
            submissionID: 'BOGUS-ID',
        }

        const result = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultSub = result.data?.fetchSubmission2.submission
        expect(resultSub).toBeNull()
    })

    it('returns multiple submissions payload with multiple revisions', async () => {
        const server = await constructTestPostgresServer()

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)
        const createdID = stateSubmission.id

        // unlock it
        await unlockTestDraftSubmission(cmsServer, createdID, 'Super duper good reason.')

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        const result = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultSub = result.data?.fetchSubmission2.submission
        expect(resultSub.id).toEqual(createdID)
        expect(resultSub.revisions.length).toEqual(2)
    })

    it('synthesizes the right statuses as a submission is submitted/unlocked/etc', async () => {
        const server = await constructTestPostgresServer()

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)
        const createdID = stateSubmission.id

        // DRAFT
        const fetchInput = {
            submissionID: createdID,
        }

        const draftResult = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input: fetchInput },
        })

        expect(draftResult.errors).toBeUndefined()

        const resultSub = draftResult.data?.fetchSubmission2.submission

        const today = todaysDate()

        expect(resultSub.status).toEqual('SUBMITTED')
        expect(resultSub.intiallySubmittedAt).toEqual(today)


        // unlock it
        await unlockTestDraftSubmission(cmsServer, createdID, 'Super duper good reason.')

        const unlockResult = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input: fetchInput },
        })

        expect(unlockResult.errors).toBeUndefined()

        expect(unlockResult.data?.fetchSubmission2.submission.status).toEqual('UNLOCKED')
        expect(unlockResult.data?.fetchSubmission2.submission.intiallySubmittedAt).toEqual(today)


        // resubmit it
        await submitTestDraftSubmission(server, createdID)

        const resubmitResult = await server.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input: fetchInput },
        })

        expect(resubmitResult.errors).toBeUndefined()

        expect(resubmitResult.data?.fetchSubmission2.submission.status).toEqual('RESUBMITTED')
        expect(resubmitResult.data?.fetchSubmission2.submission.intiallySubmittedAt).toEqual(today)


    })

    it('a different user from the same state can fetch the draft', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'FL',
                    role: 'STATE_USER',
                    email: 'aang@mn.gov',
                },
            },
        })

        const result = await otherUserServer.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        expect(result.data?.fetchSubmission2.submission).toBeDefined()
        expect(result.data?.fetchSubmission2.submission).not.toBeNull()
    })

    it('returns an error if you are requesting for a different state (403)', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@va.gov',
                },
            },
        })

        const result = await otherUserServer.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }
        expect(result.errors?.length).toEqual(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toEqual(
            'user not authorized to fetch data from a different state'
        )
        expect(resultErr?.extensions?.code).toEqual('FORBIDDEN')
    })

    it('returns an error if you are a CMS user requesting a draft submission', async () => {
        const server = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'zuko@example.com',
                },
            },
        })

        // First, create a new submission
        const stateSubmission = await createTestDraftSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        const result = await cmsServer.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }
        expect(result.errors?.length).toEqual(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toEqual(
            'CMS user not authorized to fetch a draft'
        )
        expect(resultErr?.extensions?.code).toEqual('FORBIDDEN')
    })

    it('returns the revisions in the correct order', async () => {
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

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id, 'Super duper good reason.')

        await submitTestDraftSubmission(stateServer, stateSubmission.id,)

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id, 'Super duper good reason.')

        await submitTestDraftSubmission(stateServer, stateSubmission.id)

        await unlockTestDraftSubmission(cmsServer, stateSubmission.id, 'Super duper good reason.')

        const input = {
            submissionID: stateSubmission.id,
        }

        const result = await cmsServer.executeOperation({
            query: FETCH_SUBMISSION_2,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        let maxDate = new Date(8640000000000000);
        let mostRecentDate = maxDate
        for (const rev of result?.data?.fetchSubmission2.submission.revisions) {
            expect(rev.revision.createdAt.getTime()).toBeLessThan(mostRecentDate.getTime())
            mostRecentDate = rev.revision.createdAt
        }

    })

})
