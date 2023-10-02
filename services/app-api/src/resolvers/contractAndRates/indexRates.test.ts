import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type {
    RateEdge,
    Rate,
} from '../../gen/gqlServer'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'


describe('indexRates', () => {
    const mockFeatureFlags = () => testLDService({ 'rates-db-refactor': true })

    beforeEach( () => {
        mockFeatureFlags()
    })


    it('returns rate reviews list for cms user', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
        },
        })
        // first, submit new packages that include rates
        const draft1 = await createAndSubmitTestHealthPlanPackage(stateServer)
        const draft2 = await  createAndSubmitTestHealthPlanPackage(stateServer)

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const ratesIndex = result.data?.indexRates

        // pull out rates the way they are handled on dashboard
        const testRateIDs = [draft1.id, draft2.id]
        const testRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: RateEdge) =>
                testRateIDs.includes(test.node.id)
            )

        expect(testRates).toHaveLength(0)
    })

    it('returns ForbiddenError for state user', async() =>{
        const stateServer = await constructTestPostgresServer()

        // submit packages that include rates
        await createAndSubmitTestHealthPlanPackage(stateServer)
         await  createAndSubmitTestHealthPlanPackage(stateServer)

        // index rates
        const result = await stateServer.executeOperation({
            query: INDEX_RATES,
        })
        expect(result.errors).toBeDefined()


    })
    it.todo('returns an empty list if only draft packages exist')
    it.todo('synthesizes the right statuses as a rate is submitted, unlocked, resubmitted')
})
