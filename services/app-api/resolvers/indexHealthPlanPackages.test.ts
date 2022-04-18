import INDEX_HEALTH_PLAN_PACKAGES from '../../app-graphql/src/queries/indexHealthPlanPackages.graphql'
import {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
    createAndSubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
} from '../testHelpers/gqlHelpers'
import { todaysDate } from '../testHelpers/dateHelpers'
import { HealthPlanPackageEdge, HealthPlanPackage } from '../gen/gqlServer'
import { latestFormData } from '../testHelpers/healthPlanPackageHelpers'

describe('indexHealthPlanPackages', () => {
    it('returns a list of submissions that includes newly created entries', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const draftPkg = await createTestHealthPlanPackage(server)
        const draftFormData = latestFormData(draftPkg)

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(server)
        const submittedFormData = latestFormData(submittedPkg)

        // then see if we can get that same submission back from the index
        const result = await server.executeOperation({
            query: INDEX_HEALTH_PLAN_PACKAGES,
        })

        expect(result.errors).toBeUndefined()

        const submissionsIndex = result.data?.indexHealthPlanPackages

        expect(submissionsIndex.totalCount).toBeGreaterThan(1)

        // Since we don't wipe the DB between tests,filter out extraneous submissions and grab new submissions by ID to confirm they are returned
        const theseSubmissions: HealthPlanPackage[] = submissionsIndex.edges
            .map((edge: HealthPlanPackageEdge) => edge.node)
            .filter((sub: HealthPlanPackage) =>
                [draftPkg.id, submittedPkg.id].includes(sub.id)
            )
        // specific submissions by id exist
        expect(theseSubmissions).toHaveLength(2)

        // confirm some submission data is correct too, first in list will be draft, second is the submitted
        expect(theseSubmissions[0].initiallySubmittedAt).toBeNull()
        expect(theseSubmissions[0].status).toBe('DRAFT')
        expect(latestFormData(theseSubmissions[0]).submissionDescription).toBe(
            draftFormData.submissionDescription
        )
        expect(theseSubmissions[1].initiallySubmittedAt).toBe(todaysDate())
        expect(theseSubmissions[1].status).toBe('SUBMITTED')
        expect(latestFormData(theseSubmissions[1]).submissionDescription).toBe(
            submittedFormData.submissionDescription
        )
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
        const draftSubmission = await createTestHealthPlanPackage(server)
        const submittedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const unlockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const relockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        // unlock two
        await unlockTestHealthPlanPackage(
            cmsServer,
            unlockedSubmission.id,
            'Test reason'
        )
        await unlockTestHealthPlanPackage(
            cmsServer,
            relockedSubmission.id,
            'Test reason'
        )

        // resubmit one
        await resubmitTestHealthPlanPackage(
            server,
            relockedSubmission.id,
            'Test first resubmission'
        )

        // index submissions api request
        const result = await server.executeOperation({
            query: INDEX_HEALTH_PLAN_PACKAGES,
        })
        const submissionsIndex = result.data?.indexHealthPlanPackages

        // pull out test related submissions and order them
        const testSubmissionIDs = [
            draftSubmission.id,
            submittedSubmission.id,
            unlockedSubmission.id,
            relockedSubmission.id,
        ]
        const testSubmissions: HealthPlanPackage[] = submissionsIndex.edges
            .map((edge: HealthPlanPackageEdge) => edge.node)
            .filter((test: HealthPlanPackage) =>
                testSubmissionIDs.includes(test.id)
            )

        expect(testSubmissions).toHaveLength(4)

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
        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            pkgID: createdID,
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
            query: INDEX_HEALTH_PLAN_PACKAGES,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()
        const submissions = result.data?.indexHealthPlanPackages.edges.map(
            (edge: HealthPlanPackageEdge) => edge.node
        )
        expect(submissions).not.toBeNull()
        expect(submissions.length).toBeGreaterThan(1)

        const testSubmission = submissions.filter(
            (test: HealthPlanPackage) => test.id === createdID
        )[0]
        expect(testSubmission.initiallySubmittedAt).toBe(todaysDate())
    })

    it('returns no submissions for a different states user', async () => {
        const server = await constructTestPostgresServer()

        await createTestHealthPlanPackage(server)
        await createAndSubmitTestHealthPlanPackage(server)

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
            query: INDEX_HEALTH_PLAN_PACKAGES,
        })

        expect(result.errors).toBeUndefined() // Is this really what we want? I thought this would be 403 unauthorized

        const indexHealthPlanPackages = result.data?.indexHealthPlanPackages
        expect(indexHealthPlanPackages).toEqual({ edges: [], totalCount: 0 })
    })
})
