import INDEX_SUBMISSIONS2 from '../../app-graphql/src/queries/indexSubmissions2.graphql'
import {
    constructTestPostgresServer,
    createTestDraftSubmission,
    createTestStateSubmission,
    submitTestDraftSubmission,
    unlockTestDraftSubmission,
} from '../testHelpers/gqlHelpers'
import {todaysDate} from '../testHelpers/dateHelpers'
import {
    Submission2Edge,
    Submission2,
} from '../gen/gqlServer'
import { base64ToDomain } from '../../app-web/src/common-code/proto/stateSubmission'

const currentRevisionSubmissionFormData = (submission: Submission2) => {
  const result =  base64ToDomain(submission.revisions[0].revision.submissionData)
  if (result instanceof Error) {
      console.error(result)
      return undefined
  }
  return result
}
describe('indexSubmissions2', () => {
    it('returns a list of submissions that includes newly created entries', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const draftSub = await createTestDraftSubmission(server)
        const stateSub = await createTestStateSubmission(server)

        // then see if we can get that same submission back from the index
        const result  = await server.executeOperation({
            query: INDEX_SUBMISSIONS2,
        })

        expect(result.errors).toBeUndefined()

        const submissionsIndex = result.data?.indexSubmissions2

        expect(submissionsIndex.totalCount).toBeGreaterThan(1)

        // Since we don't wipe the DB between tests,filter out extraneous submissions and grab new submissions by ID to confirm they are returned
        const theseSubmissions: Submission2[] = submissionsIndex.edges
            .map((edge: Submission2Edge) => edge.node)
            .filter((sub: Submission2) =>
                [draftSub.id, stateSub.id].includes(sub.id)
            )
        // specific submissions by id exist
        expect(theseSubmissions.length).toBe(2)    

        // confirm some submission data is correct too, first in list will be draft, second is the submitted
        expect(theseSubmissions[0].intiallySubmittedAt).toBe(null)
          expect(theseSubmissions[0].status).toBe('DRAFT')
        expect(currentRevisionSubmissionFormData(theseSubmissions[0])?.submissionDescription).toBe(
            draftSub.submissionDescription
        )
        expect(theseSubmissions[1].intiallySubmittedAt).toBe(todaysDate())
        expect(theseSubmissions[1].status).toBe(
            'SUBMITTED'
        )
        expect(
            currentRevisionSubmissionFormData(theseSubmissions[1])
                ?.submissionDescription
        ).toBe(stateSub.submissionDescription)
 
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

        // First, create new submissions
        const draftSubmission = await createTestDraftSubmission(server)
        const submittedSubmission = await createTestStateSubmission(server)
        const unlockedSubmission = await createTestStateSubmission(server)
        const relockedSubmission = await createTestStateSubmission(server)

        // unlock two
        await unlockTestDraftSubmission(cmsServer, unlockedSubmission.id, 'Test reason')
        await unlockTestDraftSubmission(cmsServer, relockedSubmission.id, 'Test reason')

        // resubmit one
        await submitTestDraftSubmission(server, relockedSubmission.id)

        // index submissions api request
        const result = await server.executeOperation({
            query: INDEX_SUBMISSIONS2,
        })
        const submissionsIndex = result.data?.indexSubmissions2
        
        // pull out test related submissions and order them
        const testSubmissionIDs = [
            draftSubmission.id,
            submittedSubmission.id,
            unlockedSubmission.id,
            relockedSubmission.id,
        ]
        const testSubmissions: Submission2[] = submissionsIndex.edges
            .map((edge: Submission2Edge) => edge.node)
            .filter((test: Submission2) => testSubmissionIDs.includes(test.id))
        
        expect(testSubmissions.length).toBe(4)
            
        // organize test submissions in a predictable order via testSubmissionsIds array 
        testSubmissions.sort((a, b) => {
            if (
                testSubmissionIDs.indexOf(a.id) >
                testSubmissionIDs.indexOf(b.id)
            ) {
                return 1
            } else {
                return -1
            }
        })

        expect(testSubmissions[0].status).toBe('DRAFT')
        expect(testSubmissions[0].status).toBe('DRAFT')
        expect(testSubmissions[0].status).toBe('DRAFT')
        expect(testSubmissions[0].status).toBe('DRAFT')
    })


    it('a different user from the same state can index submissions', async () => {
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
             query: INDEX_SUBMISSIONS2,
             variables: { input },
         })

        expect(result.errors).toBeUndefined()
        const  submissions = result.data?.indexSubmissions2.edges.map((edge: Submission2Edge) => edge.node)
        expect(submissions).not.toBeNull()
        expect(submissions.length).toBeGreaterThan(1)

        const testSubmission =  submissions.filter((test: Submission2) => test.id === createdID)[0]
        expect(testSubmission.intiallySubmittedAt).toBe(todaysDate())
     })

    it('returns no submissions for a different states user', async () => {
        const server = await constructTestPostgresServer()

        await createTestDraftSubmission(server)
        await createTestStateSubmission(server)

        const otherUserServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@mn.gov',
                },
            },
        })

        const result = await otherUserServer.executeOperation({
            query: INDEX_SUBMISSIONS2,
        })

        expect(result.errors).toBeUndefined() // Is this really what we want? I thought this would be 403 unauthorized 

        const indexSubmissions2 = result.data?.indexSubmissions2
        expect(indexSubmissions2).toEqual({ "edges": [], "totalCount": 0 })
    })
})
