import { testLDService } from '../../testHelpers/launchDarklyHelpers'

import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    submitTestContract,
    createAndUpdateTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'

describe('indexRates', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const ldService = testLDService({
                'rate-edit-unlock': true,
            })
            const mockS3 = testS3Client()

            it('returns rate reviews list for cms user with no errors', async () => {
                const cmsUser = mockUser()

                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract2 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const submit1ID =
                    contract1.packageSubmissions[0].rateRevisions[0].rateID
                const submit2ID =
                    contract2.packageSubmissions[0].rateRevisions[0].rateID

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                expect(result.data).toBeDefined()
                const ratesIndex = result.data?.indexRates
                const testRateIDs = [submit1ID, submit2ID]

                expect(result.errors).toBeUndefined()
                const matchedTestRates: Rate[] = ratesIndex.edges
                    .map((edge: RateEdge) => edge.node)
                    .filter((test: Rate) => {
                        return testRateIDs.includes(test.id)
                    })

                expect(matchedTestRates).toHaveLength(2)
            })

            it('does not return rates still in initial draft', async () => {
                const cmsUser = mockUser()
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndUpdateTestContractWithRate(stateServer)
                const contract2 =
                    await createAndUpdateTestContractWithRate(stateServer)

                if (!contract1.draftRates || !contract2.draftRates) {
                    throw new Error('no draft rates')
                }

                // First, create new submissions
                const draft1 = contract1.draftRates[0]
                const draft2 = contract2.draftRates[0]

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()

                // pull out test related rates and order them
                const testRateIDs = [draft1.id, draft2.id]
                const testRates: Rate[] = ratesIndex.edges
                    .map((edge: RateEdge) => edge.node)
                    .filter((test: Rate) => {
                        return testRateIDs.includes(test.id)
                    })

                expect(testRates).toHaveLength(0)
            })

            it('return a list of submitted rates from multiple states', async () => {
                const cmsUser = mockUser()
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })
                const otherStateServer = await constructTestPostgresServer({
                    context: {
                        user: testStateUser({
                            stateCode: 'VA',
                            email: 'aang@mn.gov',
                        }),
                    },
                    ldService,
                })

                // submit packages from two different states
                const contract1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract2 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const pkg3 = await createAndUpdateTestHealthPlanPackage(
                    otherStateServer,
                    {},
                    'VA'
                )
                const contract3 = await submitTestContract(
                    otherStateServer,
                    pkg3.id
                )

                const defaultState1 =
                    contract1.packageSubmissions[0].rateRevisions[0]
                const defaultState2 =
                    contract2.packageSubmissions[0].rateRevisions[0]
                const otherState1 =
                    contract3.packageSubmissions[0].rateRevisions[0]

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()
                // Pull out only the rates results relevant to the test by using id of recently created test packages.
                const allRates: Rate[] = ratesIndex.edges.map(
                    (edge: RateEdge) => edge.node
                )
                const defaultStateRates: Rate[] = []
                const otherStateRates: Rate[] = []
                allRates.forEach((rate) => {
                    if (
                        [defaultState1.rateID, defaultState2.rateID].includes(
                            rate.id
                        )
                    ) {
                        defaultStateRates.push(rate)
                    } else if (otherState1.rateID === rate.id) {
                        otherStateRates.push(rate)
                    }
                    return
                })

                expect(defaultStateRates).toHaveLength(2)
                expect(otherStateRates).toHaveLength(1)
            })
        }
    )
})
