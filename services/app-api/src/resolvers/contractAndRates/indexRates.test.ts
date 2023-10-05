import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    createTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'

describe('indexRates', () => {
    const mockLDService = testLDService({ 'rates-db-refactor': true })

    it('returns ForbiddenError for state user', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        // submit packages that include rates
        await createAndSubmitTestHealthPlanPackage(stateServer)
        await createAndSubmitTestHealthPlanPackage(stateServer)

        // index rates
        const result = await stateServer.executeOperation({
            query: INDEX_RATES,
        })
        expect(result.errors).toBeDefined()
    })

    it('returns rate reviews list for cms user with no errors', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService: mockLDService,
            context: {
                user: cmsUser,
            },
        })
        // first, submit new packages that include rates
        const submit1 = await createAndSubmitTestHealthPlanPackage(stateServer)
        const submit2 = await createAndSubmitTestHealthPlanPackage(stateServer)
        const update1 = await createAndUpdateTestHealthPlanPackage(stateServer)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        expect(result.data).toBeDefined()
        const ratesIndex = result.data?.indexRates
        const testRateIDs = [
            latestFormData(submit1).rateInfos[0].id,
            latestFormData(submit2).rateInfos[0].id,
            latestFormData(update1).rateInfos[0].id,
        ]

        expect(result.errors).toBeUndefined()
        const matchedTestRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(matchedTestRates).toHaveLength(2) // check that we do not include the draft
    })

    it('returns an empty list if only draft packages exist', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        // First, create new submissions
        const draft1 = await createTestHealthPlanPackage(stateServer)
        const draft2 = await createTestHealthPlanPackage(stateServer)

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates

        // pull out test related rates and order them
        const testRateIDs = [draft1.id, draft2.id]
        const testRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })
        expect(testRates).toHaveLength(0)
    })

    it('synthesizes the right statuses as a rate is submitted/unlocked/etc', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        // First, create new submissions
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

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates

        // pull out test related rates and order them
        const testRateIDs = [
            latestFormData(submittedSubmission).rateInfos[0].id,
            latestFormData(unlockedSubmission).rateInfos[0].id,
            latestFormData(relockedSubmission).rateInfos[0].id,
        ]

        const testRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(testRates).toHaveLength(3)

        // organize test rates in a predictable order
        testRates.sort((a, b) => {
            if (testRateIDs.indexOf(a.id) > testRateIDs.indexOf(b.id)) {
                return 1
            } else {
                return -1
            }
        })
    })

    it('return a list of submitted rates from multiple states', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
            ldService: mockLDService,
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

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates

        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const allRates: Rate[] = ratesIndex.edges.map(
            (edge: RateEdge) => edge.node
        )
        const defaultStateRates: Rate[] = []
        const otherStateRates: Rate[] = []
        allRates.forEach((rate) => {
            if (
                [
                    latestFormData(defaultState1).rateInfos[0].id,
                    latestFormData(defaultState2).rateInfos[0].id,
                ].includes(rate.id)
            ) {
                defaultStateRates.push(rate)
            } else if (
                [latestFormData(otherState1).rateInfos[0].id].includes(rate.id)
            ) {
                otherStateRates.push(rate)
            }
            return
        })

        expect(defaultStateRates).toHaveLength(2)
        expect(otherStateRates).toHaveLength(1)
    })
})
