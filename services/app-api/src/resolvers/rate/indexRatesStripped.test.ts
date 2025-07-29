import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import type { RateStripped, RateStrippedEdge } from '../../gen/gqlClient'
import {
    IndexRatesStrippedDocument,
    IndexRatesStrippedWithRelatedContractsDocument,
} from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
import {
    createAndSubmitTestContractWithRate,
    submitTestContract,
    createAndUpdateTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-api/src/testHelpers/s3Helpers'

describe('indexRatesStripped', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    it('returns stripped rates with related contracts for cms user with no errors', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
        })

        const contract1 = await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })
        const contract2 = await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })

        const submit1ID =
            contract1.packageSubmissions[0].rateRevisions[0].rateID
        const submit2ID =
            contract2.packageSubmissions[0].rateRevisions[0].rateID

        // index rates
        const response = await cmsServer.executeOperation({
            query: IndexRatesStrippedWithRelatedContractsDocument,
            variables: {
                input: {
                    rateIDs: [submit1ID, submit2ID],
                },
            },
        }, {
            contextValue: { user: testCMSUser() },
        })
        const result = extractGraphQLResponse(response)

        expect(result.data).toBeDefined()
        const ratesIndex = result.data?.indexRatesStripped
        const testRateIDs = [submit1ID, submit2ID]

        expect(result.errors).toBeUndefined()
        const matchedTestRates: RateStripped[] = ratesIndex!.edges
            .map((edge: RateStrippedEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(matchedTestRates).toHaveLength(2)

        // Expect related contracts to have 1 contract, the parent contract
        expect(matchedTestRates[0].relatedContracts).toHaveLength(1)
        expect(matchedTestRates[1].relatedContracts).toHaveLength(1)
    })

    it('does not return rates still in initial draft', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
        })

        const contract1 = await createAndUpdateTestContractWithRate(stateServer)
        const contract2 = await createAndUpdateTestContractWithRate(stateServer)

        if (!contract1.draftRates || !contract2.draftRates) {
            throw new Error('no draft rates')
        }

        // First, create new submissions
        const draft1 = contract1.draftRates[0]
        const draft2 = contract2.draftRates[0]

        const response = await cmsServer.executeOperation({
            query: IndexRatesStrippedDocument,
        }, {
            contextValue: { user: testCMSUser() },
        })
        const result = extractGraphQLResponse(response)

        expect(result.errors).toBeUndefined()

        const ratesIndex = result.data?.indexRatesStripped

        // pull out test related rates and order them
        const testRateIDs = [draft1.id, draft2.id]
        const testRates: RateStripped[] = ratesIndex!.edges
            .map((edge: RateStrippedEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(testRates).toHaveLength(0)
    })

    it('return a list of submitted rates from multiple states', async () => {
        const stateUser = testStateUser()
        const otherStateUser = testStateUser({
            stateCode: 'VA',
            email: 'aang@mn.gov',
        })
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
        })
        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: otherStateUser,
            },
            ldService,
            s3Client: mockS3,
        })

        // submit packages from two different states
        const contract1 = await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })
        const contract2 = await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })

        const pkg3 = await createAndUpdateTestHealthPlanPackage(
            otherStateServer,
            {},
            'VA'
        )
        const contract3 = await submitTestContract(otherStateServer, pkg3.id, undefined, { user: otherStateUser })

        const defaultState1 = contract1.packageSubmissions[0].rateRevisions[0]
        const defaultState2 = contract2.packageSubmissions[0].rateRevisions[0]
        const otherState1 = contract3.packageSubmissions[0].rateRevisions[0]

        // index rates
        const response = await cmsServer.executeOperation({
            query: IndexRatesStrippedDocument,
        }, {
            contextValue: { user: testCMSUser() },
        })
        const result = extractGraphQLResponse(response)

        expect(result.errors).toBeUndefined()

        const ratesIndex = result.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const allRates: RateStripped[] = ratesIndex!.edges.map(
            (edge: RateEdge) => edge.node
        )
        const defaultStateRates: RateStripped[] = []
        const otherStateRates: RateStripped[] = []
        allRates.forEach((rate) => {
            if (
                [defaultState1.rateID, defaultState2.rateID].includes(rate.id)
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

    it('only returns state users rates', async () => {
        const flStateUser = testStateUser({
            stateCode: 'FL',
            email: 'aang-fl@example.com',
        })
        const vaStateUser = testStateUser({
            stateCode: 'VA',
            email: 'aang-va@example.com',
        })
        const flStateServer = await constructTestPostgresServer({
            context: {
                user: flStateUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const vaStateServer = await constructTestPostgresServer({
            context: {
                user: vaStateUser,
            },
            ldService,
            s3Client: mockS3,
        })

        // submit packages from two different states
        await createAndSubmitTestContractWithRate(flStateServer, undefined, { user: flStateUser })
        await createAndSubmitTestContractWithRate(vaStateServer, {
            stateCode: 'VA',
        }, { user: vaStateUser })

        // index rates
        const floridaRatesResponse = await flStateServer.executeOperation({
            query: IndexRatesStrippedDocument,
        }, {
            contextValue: { user: flStateUser },
        })
        const floridaRatesResult = extractGraphQLResponse(floridaRatesResponse)

        expect(floridaRatesResult.errors).toBeUndefined()

        const floridaRates = floridaRatesResult.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const floridaRateStateCodes: string[] = floridaRates!.edges.map(
            (edge: RateEdge) => edge.node.stateCode
        )

        expect(floridaRateStateCodes.every((code) => code === 'FL')).toBe(true)

        // index rates
        const virginiaRatesResponse = await vaStateServer.executeOperation({
            query: IndexRatesStrippedDocument,
        }, {
            contextValue: { user: vaStateUser },
        })
        const virginiaRatesResult = extractGraphQLResponse(virginiaRatesResponse)

        expect(virginiaRatesResult.errors).toBeUndefined()

        const virginiaRates = virginiaRatesResult.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const virginiaRateStateCodes: string[] = virginiaRates!.edges.map(
            (edge: RateEdge) => edge.node.stateCode
        )

        expect(virginiaRateStateCodes.every((code) => code === 'VA')).toBe(true)
    })
})
