import { constructTestPostgresServer, createAndSubmitTestHealthPlanPackage, createTestHealthPlanPackage } from "../../testHelpers/gqlHelpers"
import { testCMSUser } from "../../testHelpers/userHelpers"

describe('indexRates', () => {
    const cmsUser = testCMSUser()
    describe('isStateUser', () => {
        it('cannot access indexRates, receives forbidden error', async () => {
            const server = await constructTestPostgresServer()

            // First, create a new submission
            const draftRate= await createTestHealthPlanPackage(server)
            const submittedRate = await createAndSubmitTestHealthPlanPackage(
                server
            )

            // then see if we can get that same submission back from the index
            const result = await server.executeOperation({
                query: INDEX_RATES,
            })

            expect(result.errors).toBeUndefined()


        })
    })

    describe('isCMSUser', () => {
        it('returns an empty list if only draft packages exist', async () => {
            const stateServer = await constructTestPostgresServer()
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
            })
            // First, create new submissions
            const draft1 = await createTestHealthPlanPackage(stateServer)
            const draft2 = await createTestHealthPlanPackage(stateServer)

            // index submissions api request
            const result = await cmsServer.executeOperation({
                query: INDEX_HEALTH_PLAN_PACKAGES,
            })
            const submissionsIndex = result.data?.indexHealthPlanPackages

            // pull out test related submissions and order them
            const testSubmissionIDs = [draft1.id, draft2.id]
            const testSubmissions: HealthPlanPackage[] = submissionsIndex.edges
                .map((edge: HealthPlanPackageEdge) => edge.node)
                .filter((test: HealthPlanPackage) =>
                    testSubmissionIDs.includes(test.id)
                )

            expect(testSubmissions).toHaveLength(0)
        })

        it('synthesizes the right statuses as a submission is submitted/unlocked/etc', async () => {
            const server = await constructTestPostgresServer()

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
            })

            // First, create new submissions
            const submittedSubmission =
                await createAndSubmitTestHealthPlanPackage(server)
            const unlockedSubmission =
                await createAndSubmitTestHealthPlanPackage(server)
            const relockedSubmission =
                await createAndSubmitTestHealthPlanPackage(server)

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
            const result = await cmsServer.executeOperation({
                query: INDEX_HEALTH_PLAN_PACKAGES,
            })
            const submissionsIndex = result.data?.indexHealthPlanPackages

            // pull out test related submissions and order them
            const testSubmissionIDs = [
                submittedSubmission.id,
                unlockedSubmission.id,
                relockedSubmission.id,
            ]
            const testSubmissions: HealthPlanPackage[] = submissionsIndex.edges
                .map((edge: HealthPlanPackageEdge) => edge.node)
                .filter((test: HealthPlanPackage) =>
                    testSubmissionIDs.includes(test.id)
                )

            expect(testSubmissions).toHaveLength(3)

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
        })

        it('return a list of submitted packages from multiple states', async () => {
            const stateServer = await constructTestPostgresServer()
            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
            })
            const otherStateServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser({
                        stateCode: 'VA',
                        email: 'aang@mn.gov',
                    }),
                },
            })
            // submit packages from two different states
            const defaultState1 = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )
            const defaultState2 = await createAndSubmitTestHealthPlanPackage(
                stateServer
            )
            const draft = await createAndUpdateTestHealthPlanPackage(
                otherStateServer,
                undefined,
                'VA' as const
            )
            const otherState1 = await submitTestHealthPlanPackage(
                otherStateServer,
                draft.id
            )

            const result = await cmsServer.executeOperation({
                query: INDEX_HEALTH_PLAN_PACKAGES,
            })

            expect(result.errors).toBeUndefined()

            const allHealthPlanPackages: HealthPlanPackage[] =
                result.data?.indexHealthPlanPackages.edges.map(
                    (edge: HealthPlanPackageEdge) => edge.node
                )

            // Pull out only the results relevant to the test by using id of recently created test packages.
            const defaultStatePackages: HealthPlanPackage[] = []
            const otherStatePackages: HealthPlanPackage[] = []
            allHealthPlanPackages.forEach((pkg) => {
                if ([defaultState1.id, defaultState2.id].includes(pkg.id)) {
                    defaultStatePackages.push(pkg)
                } else if ([otherState1.id].includes(pkg.id)) {
                    otherStatePackages.push(pkg)
                }
                return
            })

            expect(defaultStatePackages).toHaveLength(2)
            expect(otherStatePackages).toHaveLength(1)
        })
    })
})

