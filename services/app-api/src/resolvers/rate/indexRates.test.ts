import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { IndexRatesDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    resetDefaultTestUser,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testStateUser,
    createDBUsersWithFullData,
} from '../../testHelpers/userHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-api/src/testHelpers/s3Helpers'

describe('indexRates', () => {
    beforeEach(() => {
        // Reset default test user state before each test
        resetDefaultTestUser()
    })

    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const ldService = testLDService({
                'rate-edit-unlock': true,
            })
            const mockS3 = testS3Client()
            const stateUser = testStateUser()
            const vaStateUser = testStateUser({
                stateCode: 'VA',
                email: 'aang@mn.gov',
            })
            const cmsUser = mockUser()

            beforeAll(async () => {
                // Pre-create users to avoid duplicate creation during server setup
                await createDBUsersWithFullData([
                    stateUser,
                    vaStateUser,
                    cmsUser,
                ])
            })

            it(
                'returns rate reviews list for cms user with no errors',
                { timeout: 30000 },
                async () => {
                    const stateServer = await constructTestPostgresServer({
                        context: {
                            user: stateUser,
                        },
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

                    const contract1 = await createAndSubmitTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )
                    const contract2 = await createAndSubmitTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )

                    const submit1ID =
                        contract1.packageSubmissions[0].rateRevisions[0].rateID
                    const submit2ID =
                        contract2.packageSubmissions[0].rateRevisions[0].rateID

                    // index rates
                    const response = await cmsServer.executeOperation(
                        {
                            query: IndexRatesDocument,
                        },
                        {
                            contextValue: { user: cmsUser },
                        }
                    )
                    const result = extractGraphQLResponse(response)

                    expect(result.data).toBeDefined()
                    const ratesIndex = result.data?.indexRates
                    const testRateIDs = [submit1ID, submit2ID]

                    expect(result.errors).toBeUndefined()
                    const matchedTestRates: Rate[] = ratesIndex!.edges
                        .map((edge: RateEdge) => edge.node)
                        .filter((test: Rate) => {
                            return testRateIDs.includes(test.id)
                        })

                    expect(matchedTestRates).toHaveLength(2)
                }
            )

            it(
                'does not return rates still in initial draft',
                { timeout: 30000 },
                async () => {
                    const stateServer = await constructTestPostgresServer({
                        context: {
                            user: stateUser,
                        },
                        ldService,
                        s3Client: mockS3,
                    })
                    const cmsServer = await constructTestPostgresServer({
                        context: {
                            user: cmsUser,
                        },
                        s3Client: mockS3,
                    })

                    const contract1 = await createAndUpdateTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )
                    const contract2 = await createAndUpdateTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )

                    if (!contract1.draftRates || !contract2.draftRates) {
                        throw new Error('no draft rates')
                    }

                    // First, create new submissions
                    const draft1 = contract1.draftRates[0]
                    const draft2 = contract2.draftRates[0]

                    // index rates
                    const response = await cmsServer.executeOperation(
                        {
                            query: IndexRatesDocument,
                        },
                        {
                            contextValue: { user: cmsUser },
                        }
                    )
                    const result = extractGraphQLResponse(response)

                    const ratesIndex = result.data?.indexRates
                    expect(result.errors).toBeUndefined()

                    // pull out test related rates and order them
                    const testRateIDs = [draft1.id, draft2.id]
                    const testRates: Rate[] = ratesIndex!.edges
                        .map((edge: RateEdge) => edge.node)
                        .filter((test: Rate) => {
                            return testRateIDs.includes(test.id)
                        })

                    expect(testRates).toHaveLength(0)
                }
            )

            it(
                'return a list of submitted rates from multiple states',
                { timeout: 30000 },
                async () => {
                    const stateServer = await constructTestPostgresServer({
                        context: {
                            user: stateUser,
                        },
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
                            user: vaStateUser,
                        },
                        ldService,
                        s3Client: mockS3,
                    })

                    // submit packages from two different states
                    const contract1 = await createAndSubmitTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )
                    const contract2 = await createAndSubmitTestContractWithRate(
                        stateServer,
                        undefined,
                        { user: stateUser }
                    )

                    const contract3 = await createAndSubmitTestContractWithRate(
                        otherStateServer,
                        {
                            stateCode: 'VA',
                        },
                        {
                            user: vaStateUser,
                        }
                    )

                    const defaultState1 =
                        contract1.packageSubmissions[0].rateRevisions[0]
                    const defaultState2 =
                        contract2.packageSubmissions[0].rateRevisions[0]
                    const otherState1 =
                        contract3.packageSubmissions[0].rateRevisions[0]

                    // index rates
                    const response = await cmsServer.executeOperation(
                        {
                            query: IndexRatesDocument,
                        },
                        {
                            contextValue: { user: cmsUser },
                        }
                    )
                    const result = extractGraphQLResponse(response)

                    const ratesIndex = result.data?.indexRates
                    expect(result.errors).toBeUndefined()
                    // Pull out only the rates results relevant to the test by using id of recently created test packages.
                    const allRates: Rate[] = ratesIndex!.edges.map(
                        (edge: RateEdge) => edge.node
                    )
                    const defaultStateRates: Rate[] = []
                    const otherStateRates: Rate[] = []
                    allRates.forEach((rate) => {
                        if (
                            [
                                defaultState1.rateID,
                                defaultState2.rateID,
                            ].includes(rate.id)
                        ) {
                            defaultStateRates.push(rate)
                        } else if (otherState1.rateID === rate.id) {
                            otherStateRates.push(rate)
                        }
                        return
                    })

                    expect(defaultStateRates).toHaveLength(2)
                    expect(otherStateRates).toHaveLength(1)
                }
            )
        }
    )
})
