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
        const stateServer = await constructTestPostgresServer({
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

        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const contract2 = await createAndSubmitTestContractWithRate(stateServer)

        const submit1ID =
            contract1.packageSubmissions[0].rateRevisions[0].rateID
        const submit2ID =
            contract2.packageSubmissions[0].rateRevisions[0].rateID

        // index rates
        const result = await cmsServer.executeOperation({
            query: IndexRatesStrippedWithRelatedContractsDocument,
            variables: {
                input: {
                    rateIDs: [submit1ID, submit2ID],
                },
            },
        })

        expect(result.data).toBeDefined()
        const ratesIndex = result.data?.indexRatesStripped
        const testRateIDs = [submit1ID, submit2ID]

        expect(result.errors).toBeUndefined()
        const matchedTestRates: RateStripped[] = ratesIndex.edges
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

        const result = await cmsServer.executeOperation({
            query: IndexRatesStrippedDocument,
        })

        expect(result.errors).toBeUndefined()

        const ratesIndex = result.data?.indexRatesStripped

        // pull out test related rates and order them
        const testRateIDs = [draft1.id, draft2.id]
        const testRates: RateStripped[] = ratesIndex.edges
            .map((edge: RateStrippedEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(testRates).toHaveLength(0)
    })

    it('return a list of submitted rates from multiple states', async () => {
        const stateServer = await constructTestPostgresServer({
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
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
            ldService,
        })

        // submit packages from two different states
        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const contract2 = await createAndSubmitTestContractWithRate(stateServer)

        const pkg3 = await createAndUpdateTestHealthPlanPackage(
            otherStateServer,
            {},
            'VA'
        )
        const contract3 = await submitTestContract(otherStateServer, pkg3.id)

        const defaultState1 = contract1.packageSubmissions[0].rateRevisions[0]
        const defaultState2 = contract2.packageSubmissions[0].rateRevisions[0]
        const otherState1 = contract3.packageSubmissions[0].rateRevisions[0]

        // index rates
        const result = await cmsServer.executeOperation({
            query: IndexRatesStrippedDocument,
        })

        expect(result.errors).toBeUndefined()

        const ratesIndex = result.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const allRates: RateStripped[] = ratesIndex.edges.map(
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
        const flStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'FL',
                    email: 'aang-fl@example.com',
                }),
            },
            ldService,
            s3Client: mockS3,
        })
        const vaStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang-va@example.com',
                }),
            },
            ldService,
        })

        // submit packages from two different states
        await createAndSubmitTestContractWithRate(flStateServer)
        await createAndSubmitTestContractWithRate(vaStateServer, {
            stateCode: 'VA',
        })

        // index rates
        const floridaRatesResult = await flStateServer.executeOperation({
            query: IndexRatesStrippedDocument,
        })

        expect(floridaRatesResult.errors).toBeUndefined()

        const floridaRates = floridaRatesResult.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const floridaRateStateCodes: string[] = floridaRates.edges.map(
            (edge: RateEdge) => edge.node.stateCode
        )

        expect(floridaRateStateCodes.every((code) => code === 'FL')).toBe(true)

        // index rates
        const virginiaRatesResult = await vaStateServer.executeOperation({
            query: IndexRatesStrippedDocument,
        })

        expect(virginiaRatesResult.errors).toBeUndefined()

        const virginiaRates = virginiaRatesResult.data?.indexRatesStripped
        // Pull out only the rates results relevant to the test by using id of recently created test packages.
        const virginiaRateStateCodes: string[] = virginiaRates.edges.map(
            (edge: RateEdge) => edge.node.stateCode
        )

        expect(virginiaRateStateCodes.every((code) => code === 'VA')).toBe(true)
    })
})
