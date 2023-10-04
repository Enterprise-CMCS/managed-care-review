import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'

describe('indexRates', () => {
    const mockLDService = testLDService({ 'rates-db-refactor': true })

    it('returns rate reviews list for cms user', async () => {
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

        const matchedTestRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(matchedTestRates).toHaveLength(2) // check that we do not include the draft
    })

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
    it.todo(
        'synthesizes the right statuses as a rate is submitted, unlocked, resubmitted'
    )
})
